// Cloudflare Worker scaffold to write to D1. Bind D1 as env.D1.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/write/vacancies') {
      const body = await request.json();
      // Basic validation
      if (!body || !body.id || !body.title) {
        return new Response(JSON.stringify({ success: false, message: 'missing fields' }), { status: 400 });
      }

      // Upsert into D1 (simple upsert pattern)
      const upsertSql = `
        INSERT INTO vacancies (id, slug, title, department, location, employment_type, salary_range, description_html, requirements_json, responsibilities_json, status, posted_by, posted_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          slug = excluded.slug,
          title = excluded.title,
          department = excluded.department,
          location = excluded.location,
          employment_type = excluded.employment_type,
          salary_range = excluded.salary_range,
          description_html = excluded.description_html,
          requirements_json = excluded.requirements_json,
          responsibilities_json = excluded.responsibilities_json,
          status = excluded.status,
          posted_by = excluded.posted_by,
          updated_at = excluded.updated_at;
      `;

      const params = [
        body.id,
        body.slug || body.id,
        body.title,
        body.department || null,
        body.location || null,
        body.employmentType || null,
        body.salaryRange || null,
        body.descriptionHtml || null,
        JSON.stringify(body.requirements || []),
        JSON.stringify(body.responsibilities || []),
        body.status || 'draft',
        body.postedBy || null,
        body.postedAt || new Date().toISOString(),
        body.updatedAt || new Date().toISOString(),
      ];

      try {
        const result = await env.D1.prepare(upsertSql).bind(...params).run();

        // After persisting to D1, notify the sync-service (if configured)
        try {
          if (env.SYNC_SERVICE_URL && env.SYNC_SECRET) {
            const payload = {
              id: body.id,
              slug: body.slug || body.id,
              title: body.title,
              department: body.department || null,
              location: body.location || null,
              employmentType: body.employmentType || null,
              salaryRange: body.salaryRange || null,
              descriptionHtml: body.descriptionHtml || null,
              requirements: body.requirements || [],
              responsibilities: body.responsibilities || [],
              status: body.status || 'draft',
              postedBy: body.postedBy || null,
              postedAt: body.postedAt || new Date().toISOString(),
              updatedAt: body.updatedAt || new Date().toISOString(),
            };

            // Compute HMAC-SHA256 signature using the SYNC_SECRET
            const encoder = new TextEncoder();
            const keyData = encoder.encode(env.SYNC_SECRET);
            const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(JSON.stringify(payload)));
            const signatureArray = Array.from(new Uint8Array(signatureBuffer));
            const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Fire-and-forget POST to sync-service
            const notifyResp = await fetch(env.SYNC_SERVICE_URL + '/sync/vacancies', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-sync-signature': signatureHex,
              },
              body: JSON.stringify(payload),
            });

            if (!notifyResp.ok) {
              // If sync-service rejected the notification, store in DLQ table for later inspection/retry
              try {
                const dlqSql = `INSERT OR REPLACE INTO d1_dlq (id, payload_json, error_message, attempts, first_failed_at, last_failed_at) VALUES (?, ?, ?, COALESCE((SELECT attempts FROM d1_dlq WHERE id = ?), 0) + 1, COALESCE((SELECT first_failed_at FROM d1_dlq WHERE id = ?), ?), ?)`;
                const now = new Date().toISOString();
                await env.D1.prepare(dlqSql).bind(body.id, JSON.stringify(payload), `notify_failed:${notifyResp.status}`, body.id, body.id, now, now).run();
              } catch (dlqErr) {
                console.error('Failed to write DLQ after notify failure:', dlqErr);
              }
            }
          }
        } catch (notifErr) {
          // If notification fails entirely, store in DLQ
          try {
            const dlqSql = `INSERT OR REPLACE INTO d1_dlq (id, payload_json, error_message, attempts, first_failed_at, last_failed_at) VALUES (?, ?, ?, COALESCE((SELECT attempts FROM d1_dlq WHERE id = ?), 0) + 1, COALESCE((SELECT first_failed_at FROM d1_dlq WHERE id = ?), ?), ?)`;
            const now = new Date().toISOString();
            await env.D1.prepare(dlqSql).bind(body.id, JSON.stringify(body), `notif_err:${notifErr.message}`, body.id, body.id, now, now).run();
          } catch (dlqErr) {
            console.error('Failed to write DLQ after notification exception:', dlqErr);
          }
        }

        return new Response(JSON.stringify({ success: true, result: result }), { status: 200 });
      } catch (err) {
        // On D1 write failure, persist the payload into d1_dlq for later replay
        try {
          const dlqSql = `INSERT OR REPLACE INTO d1_dlq (id, payload_json, error_message, attempts, first_failed_at, last_failed_at) VALUES (?, ?, ?, COALESCE((SELECT attempts FROM d1_dlq WHERE id = ?), 0) + 1, COALESCE((SELECT first_failed_at FROM d1_dlq WHERE id = ?), ?), ?)`;
          const now = new Date().toISOString();
          await env.D1.prepare(dlqSql).bind(body.id, JSON.stringify(body), `d1_err:${err.message}`, body.id, body.id, now, now).run();
        } catch (dlqErr) {
          console.error('Failed to write DLQ after D1 error:', dlqErr);
        }
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};

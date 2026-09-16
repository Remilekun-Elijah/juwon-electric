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
        return new Response(JSON.stringify({ success: true, result: result }), { status: 200 });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};

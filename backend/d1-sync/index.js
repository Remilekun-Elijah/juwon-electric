// Minimal sync-service scaffold: listens for Worker webhook notifications and upserts into MongoDB
// This service assumes D1 is primary and the Worker will POST events here (or the Worker can forward events via pub/sub).

import express from 'express';
import { MongoClient } from 'mongodb';

const app = express();
app.use(express.json());

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/juwon_electric';
let db;

(async function init() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db();
})();

// Simple endpoint the Worker can call to notify of a vacancy write
app.post('/sync/vacancies', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.id) return res.status(400).json({ success: false, message: 'missing id' });

  // Verify signature if SYNC_SECRET is configured
  try {
    const syncSecret = process.env.SYNC_SECRET;
    if (syncSecret) {
      const signature = req.get('x-sync-signature') || '';
      const crypto = await import('crypto');
      const hmac = crypto.createHmac('sha256', syncSecret);
      hmac.update(JSON.stringify(payload));
      const expected = hmac.digest('hex');
      if (!signature || !crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
        return res.status(401).json({ success: false, message: 'invalid signature' });
      }
    }
  } catch (err) {
    console.error('signature verify error', err);
    return res.status(500).json({ success: false, error: 'signature verification failed' });
  }

  try {
    const vac = {
      _id: payload.id,
      slug: payload.slug,
      title: payload.title,
      department: payload.department,
      location: payload.location,
      employmentType: payload.employmentType,
      salaryRange: payload.salaryRange,
      descriptionHtml: payload.descriptionHtml,
      requirements: payload.requirements || [],
      responsibilities: payload.responsibilities || [],
      status: payload.status || 'draft',
      postedBy: payload.postedBy || null,
      postedAt: payload.postedAt || new Date().toISOString(),
      updatedAt: payload.updatedAt || new Date().toISOString(),
    };

    // Upsert into vacancies collection
    await db.collection('vacancies').updateOne({ _id: vac._id }, { $set: vac }, { upsert: true });
    return res.json({ success: true });
  } catch (err) {
    console.error('sync error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(process.env.PORT || 3005, () => console.log('D1-sync listening on port', process.env.PORT || 3005));

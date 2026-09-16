D1-sync service

This scaffold implements a minimal sync-service that receives write notifications (e.g., from the D1 Worker) and upserts records into MongoDB. The architecture assumes D1 is the primary DB and MongoDB is a replica used for complex queries and admin operations.

How it works:
- Deploy the Worker (workers/d1-write) to Cloudflare and bind D1.
- Configure the Worker to POST to the sync-service endpoint /sync/vacancies after successful writes (or have the app call both endpoints).
- Run this service with MONGODB_URI set to your Mongo instance.

Run locally:
- cd backend/d1-sync
- npm install
- MONGODB_URI="mongodb://localhost:27017/juwon_electric" node index.js

Security:
- Use a signed secret or auth mechanism between Worker and sync-service. Do NOT expose this endpoint publicly without auth.

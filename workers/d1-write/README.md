D1 Write Worker

This Cloudflare Worker accepts write requests and persists them to the D1 database. It also notifies the sync-service and stores failed notifications or D1 write failures in a DLQ table (d1_dlq) for later replay.

Environment variables (wrangler):
- D1 binding: D1
- SYNC_SERVICE_URL: https://internal-sync-service.example
- SYNC_SECRET: secret used to HMAC payloads

Deploy with wrangler after configuring d1 and account details.

DLQ handling
- The worker writes failed events into the d1_dlq table. A maintenance process or admin endpoint should replay these entries to the sync-service.

Security
- The worker will include an HMAC-SHA256 signature header when notifying the sync-service. The sync-service must verify the signature using SYNC_SECRET.

Note: The Worker uses only D1 and does not require MongoDB for writes; MongoDB sync is handled asynchronously by the sync-service.

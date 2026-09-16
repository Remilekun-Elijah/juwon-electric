Run backend with Docker

Build the image:

  docker build -f backend/Dockerfile -t juwon-backend .

Run the container (example):

  docker run --rm -p 3000:3000 \
    -e MONGODB_URI="your_mongodb_uri" \
    -e ADMIN_AUTH_SECRET="at-least-32-characters" \
    -e SMTP_USER="user" \
    -e SMTP_SECRET="app-password" \
    -e SMTP_FROM="noreply@example.com" \
    juwon-backend

Every environment variable (Express, Worker and Vercel) is listed in docs/DEPLOYMENT.md.

Notes
- Do NOT commit secrets. Use environment variables in your CI/CD provider or local .env files for development.
- For development you may prefer mounting the source and running npm install / npm run dev instead of building the image.

Quickstart (local development):

1. Ensure MongoDB is available and set MONGODB_URI environment variable (e.g. mongodb://localhost:27017/juwon)
2. From the backend folder run:
   npm install
   npm run dev

Environment variables: see backend/.env.example and docs/DEPLOYMENT.md (for example MONGODB_URI, ADMIN_AUTH_SECRET, SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD, SMTP_USER/SMTP_SECRET/SMTP_FROM).
Tests and lint: npm test, npm run lint (Node 22.5 or newer).

Vacancies API examples (replace localhost:9000 with your host; see docs/API.md "Vacancies"):

# List public open vacancies (also served at /api/vacancies)
curl -sS http://localhost:9000/vacancies | jq

# Get an open vacancy by slug
curl -sS http://localhost:9000/vacancies/some-slug | jq

# Sign in as an admin with vacancies:write (superadmin, admin or hr)
TOKEN=$(curl -sS -X POST http://localhost:9000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hr@example.com","password":"..."}' | jq -r .data.token)

# Create a draft, then publish it
curl -sS -X POST http://localhost:9000/admin/vacancies \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Electrician","department":"Field","location":"Lagos","employmentType":"full-time","descriptionHtml":"<p>Job details</p>","requirements":["3 years experience"]}' | jq
curl -sS -X POST http://localhost:9000/admin/vacancies/<id>/publish -H "Authorization: Bearer $TOKEN" | jq

# Update, close and delete
curl -sS -X PUT http://localhost:9000/admin/vacancies/<id> \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Senior Electrician","status":"closed"}' | jq
curl -sS -X DELETE http://localhost:9000/admin/vacancies/<id> -H "Authorization: Bearer $TOKEN" | jq

Notes:
- Vacancy writes require an admin session with the vacancies:write capability. Client headers such as X-User-Role are ignored.
- descriptionHtml is sanitised server-side by backend/shared/richText.js (the same code runs in the Cloudflare Worker).


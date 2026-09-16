Run backend with Docker

Build the image:

  docker build -t pasted-backend ./backend

Run the container (example):

  docker run --rm -p 3000:3000 \
    -e MONGODB_URI="your_mongodb_uri" \
    -e SMTP_HOST="smtp.example.com" \
    -e SMTP_PORT="587" \
    -e SMTP_USER="user" \
    -e SMTP_PASS="pass" \
    pasted-backend

Notes
- Do NOT commit secrets. Use environment variables in your CI/CD provider or local .env files for development.
- For development you may prefer mounting the source and running npm install / npm run dev instead of building the image.

Quickstart (local development):

1. Ensure MongoDB is available and set MONGODB_URI environment variable (e.g. mongodb://localhost:27017/juwon)
2. From the backend folder run:
   npm install
   npm run dev

Required env vars:
- MONGODB_URI (mongodb connection string)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (for email features)

Vacancies API examples (replace localhost:3000 with your host):

# List public open vacancies
curl -sS http://localhost:3000/vacancies | jq

# Get vacancy detail by slug
curl -sS http://localhost:3000/vacancies/some-slug | jq

# Create vacancy (admin role via header)
curl -X POST http://localhost:3000/vacancies \
  -H "Content-Type: application/json" \
  -H "X-User-Role: admin" \
  -d '{"title":"Electrician","department":"Field","location":"Lagos","status":"open","descriptionHtml":"<p>Job details</p>"}' | jq

# Update vacancy (admin)
curl -X PUT http://localhost:3000/vacancies/<id> \
  -H "Content-Type: application/json" \
  -H "X-User-Role: admin" \
  -d '{"title":"Senior Electrician","status":"open"}' | jq

# Delete vacancy (admin)
curl -X DELETE http://localhost:3000/vacancies/<id> -H "X-User-Role: admin" | jq

Notes:
- The backend currently uses a placeholder auth middleware that reads X-User-Role. Replace with proper auth for production.
- The server sanitizes rich HTML using sanitize-html before saving descriptionHtml. If sanitize-html is missing, run npm install sanitize-html in backend.


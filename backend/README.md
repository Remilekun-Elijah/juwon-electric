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

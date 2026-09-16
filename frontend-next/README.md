This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Environment variables

When deploying to Vercel (or any CI), set the following environment variables in the project settings (do NOT commit them to the repo):

- NEXT_PUBLIC_BACKEND_URL  # Public URL of the backend API (e.g. https://api.example.com)
- MONGODB_URI              # MongoDB connection string used by the backend
- SMTP_HOST                # SMTP server host (for transactional email)
- SMTP_PORT                # SMTP server port
- SMTP_USER                # SMTP username
- SMTP_PASS                # SMTP password

Notes

- Add the secrets to Vercel (for production/preview) and to GitHub Actions repository secrets for CI builds.
- For local development, create a .env.local in frontend-next with NEXT_PUBLIC_BACKEND_URL pointing to your running backend (e.g. http://localhost:3000).

Role-based admin testing

- The admin pages in this scaffold perform a small client-side role check using the browser localStorage key `je-user-role`. To simulate an HR/admin user locally, open the browser console and run:

  localStorage.setItem('je-user-role','hr')

  or to remove the role:

  localStorage.removeItem('je-user-role')

- This is only a development convenience. In production, the backend must gate admin endpoints and the frontend should use secure auth.


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

## Production Deployment

This project is deployed on AWS EC2 using Docker with nginx as a reverse proxy.

### Prerequisites

- Docker and Docker Compose installed on the server
- Domain DNS pointing to the EC2 instance IP
- Ports 80 and 443 open in the security group

### Deploy with Docker

```bash
# Clone the repo and set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase and API keys

# Start the application
docker compose up -d
```

### SSL Setup (HTTPS)

After deploying, run the SSL initialization script to obtain a Let's Encrypt certificate:

```bash
# Make the script executable
chmod +x init-ssl.sh

# Run with your email for certificate notifications
./init-ssl.sh your-email@example.com
```

The script will:
1. Temporarily configure nginx for HTTP-only access
2. Request an SSL certificate from Let's Encrypt
3. Configure nginx with HTTPS
4. Set up automatic certificate renewal

After completion, the site will be available at `https://admin.newmainerproject.org`

### Manual SSL Renewal

Certificates auto-renew via the certbot container. To manually renew:

```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

## Deploy on Vercel

Alternatively, deploy on the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

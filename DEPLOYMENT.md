# CANMP Deployment Guide

## Overview

The CANMP application is deployed to an AWS EC2 instance running Docker. Deployments are automated via GitHub Actions when code is pushed to the `master` or `main` branch.

## Infrastructure

- **EC2 Instance**: `i-055e0c6edaf1ab3a3`
- **IP Address**: `44.222.126.24`
- **Domain**: `admin.newmainerproject.org`
- **Region**: `us-east-1`

## GitHub Actions Workflow

The deployment workflow (`.github/workflows/deploy-ec2.yml`) performs the following:

1. **Build & Test**: Runs linting and builds the Next.js application
2. **Deploy**: SSHs into EC2 and runs `docker-compose up -d`
3. **Verify**: Checks the app is responding on port 3000

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `EC2_HOST` | EC2 instance IP address (`44.222.126.24`) |
| `EC2_SSH_KEY_BASE64` | Base64-encoded SSH private key (see below) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEON_CRM_ORG_ID` | Neon CRM organization ID |
| `NEON_CRM_API_KEY` | Neon CRM API key |
| `SYNC_API_KEY` | API key for sync operations |
| `AWS_REGION` | AWS region (`us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_S3_BUCKET` | S3 bucket for uploads |
| `AWS_CLOUDFRONT_URL` | CloudFront distribution URL |

### SSH Key Setup

The SSH key must be base64-encoded to avoid GitHub corrupting multi-line secrets:

```bash
# Generate a new SSH key (if needed)
ssh-keygen -t rsa -b 4096 -f ~/canmp-deploy-key -N ""

# Convert to PEM format
ssh-keygen -p -m PEM -f ~/canmp-deploy-key

# Base64 encode for GitHub secret
cat ~/canmp-deploy-key | base64 -w 0

# Add public key to EC2 instance
cat ~/canmp-deploy-key.pub  # Copy this to EC2's ~/.ssh/authorized_keys
```

## Manual Deployment

### SSH Access

```bash
ssh -i ~/canmp-deploy-key ubuntu@44.222.126.24
```

### Deploy Latest Code

```bash
cd /opt/canmp
git fetch origin
git reset --hard origin/master
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Check Container Status

```bash
docker-compose ps
docker-compose logs -f          # Follow all logs
docker-compose logs canmp-app   # App logs only
```

### Restart Services

```bash
docker-compose restart          # Restart all
docker-compose restart canmp-app  # Restart app only
```

## Architecture

The application runs with Docker Compose:

- **canmp-app**: Next.js application (port 3000)
- **canmp-nginx**: Reverse proxy with SSL termination (ports 80, 443)
- **canmp-certbot**: SSL certificate management (Let's Encrypt)

## Troubleshooting

### App Container Exits

If the app container keeps exiting:

```bash
# Check logs for errors
docker-compose logs canmp-app

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Health Check Fails in CI

The CI health check may fail if:
- Docker build is still in progress
- App needs more startup time
- Port 3000 is not exposed

Check via SSH:
```bash
curl http://localhost:3000
```

### SSL Certificate Issues

Certificates are automatically renewed by certbot. To manually renew:

```bash
docker-compose exec certbot certbot renew
docker-compose restart nginx
```

## Triggering Deployments

### Automatic
Push to `master` or `main` branch triggers deployment.

### Manual
```bash
gh workflow run "Deploy to EC2" --ref master
gh run list --workflow="Deploy to EC2" --limit 1  # Check status
```

## Environment Variables

Environment variables are written to `/opt/canmp/.env` during deployment from GitHub Secrets. To update:

1. Update the secret in GitHub (Settings > Secrets and variables > Actions)
2. Trigger a new deployment

Or manually on the server:
```bash
nano /opt/canmp/.env
docker-compose restart canmp-app
```

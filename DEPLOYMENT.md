# CANMP Deployment Guide

## Overview

The CANMP application is deployed to an AWS EC2 instance running Docker. Deployments are automated via GitHub Actions when code is pushed to the `master` or `main` branch.

## Current Infrastructure

| Resource | Value |
|----------|-------|
| **Instance ID** | `i-06df99878b7dde82b` |
| **Instance Type** | `t3.medium` |
| **Public IP** | `13.221.60.79` |
| **Domain** | `admin.newmainerproject.org` |
| **Security Group** | `sg-07b56cfaf1a498611` |
| **SSH Key** | `canmp-key` |
| **Region** | `us-east-1` |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   GitHub        │────▶│   EC2 Instance  │────▶│   Supabase      │
│   Actions       │     │   (Docker)      │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   CloudFront    │
                        │   (S3 Images)   │
                        └─────────────────┘
```

The application runs with Docker Compose:

- **canmp-app**: Next.js application (port 3000)
- **canmp-nginx**: Reverse proxy with SSL termination (ports 80, 443)
- **canmp-certbot**: SSL certificate management (Let's Encrypt)

## GitHub Actions Workflow

The deployment workflow (`.github/workflows/deploy-ec2.yml`) performs:

1. **Build & Test**: Runs linting and builds the Next.js application
2. **Deploy**: SSHs into EC2 and runs `docker-compose up -d`
3. **Verify**: Checks the app is responding at the production URL

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `EC2_HOST` | EC2 instance IP address |
| `EC2_SSH_KEY_BASE64` | Base64-encoded SSH private key |
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
| `APLOS_API_BASE_URL` | Aplos API base URL |
| `APLOS_CLIENT_ID` | Aplos client ID |
| `APLOS_PRIVATE_KEY` | Aplos private key |
| `RAMP_API_BASE_URL` | Ramp API base URL |
| `RAMP_CLIENT_ID` | Ramp client ID |
| `RAMP_CLIENT_SECRET` | Ramp client secret |

## Triggering Deployments

### Automatic
Push to `master` or `main` branch triggers deployment automatically.

### Manual via CLI
```bash
gh workflow run deploy-ec2.yml
gh run list --limit 5                    # Check status
gh run watch <RUN_ID>                    # Watch progress
gh run view <RUN_ID> --log-failed        # View failed logs
```

### Manual via GitHub UI
Go to Actions > Deploy to EC2 > Run workflow

---

## Fresh EC2 Setup (From Scratch)

If you need to create a new EC2 instance from scratch:

### 1. Create Security Group

```bash
# Create security group
aws ec2 create-security-group \
  --group-name canmp-web-sg \
  --description "Security group for CANMP web application"

# Get the security group ID from output, then add rules:
SECURITY_GROUP_ID="sg-xxxxxxxxx"

# SSH (port 22)
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

# HTTP (port 80)
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# HTTPS (port 443)
aws ec2 authorize-security-group-ingress \
  --group-id $SECURITY_GROUP_ID \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
```

### 2. Create SSH Key Pair

```bash
aws ec2 create-key-pair \
  --key-name canmp-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/canmp-key.pem

chmod 600 ~/.ssh/canmp-key.pem
```

### 3. Launch EC2 Instance

```bash
# Get latest Ubuntu 22.04 AMI
AMI_ID=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

# Launch instance
aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.small \
  --key-name canmp-key \
  --security-group-ids $SECURITY_GROUP_ID \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=canmp-production}]' \
  --query 'Instances[0].InstanceId' \
  --output text

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids <INSTANCE_ID>

# Get public IP
aws ec2 describe-instances --instance-ids <INSTANCE_ID> \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

### 4. Install Docker on EC2

```bash
# SSH to the instance
ssh -i ~/.ssh/canmp-key.pem ubuntu@<INSTANCE_IP>

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
sudo mkdir -p /opt/canmp
sudo chown ubuntu:ubuntu /opt/canmp

# Log out and back in for docker group to take effect
exit
```

### 5. Update GitHub Secrets

```bash
# Encode SSH key for GitHub
cat ~/.ssh/canmp-key.pem | base64 -w 0 > /tmp/canmp-key-base64.txt

# Update secrets
echo "<INSTANCE_IP>" | gh secret set EC2_HOST
cat /tmp/canmp-key-base64.txt | gh secret set EC2_SSH_KEY_BASE64

# Clean up
rm /tmp/canmp-key-base64.txt
```

### 6. Update DNS

Update the A record for `admin.newmainerproject.org` to point to the new IP address.

- **DNS Provider**: GoDaddy
- **Record Type**: A
- **Host**: admin
- **Value**: `<INSTANCE_IP>`

### 7. Trigger First Deployment

```bash
gh workflow run deploy-ec2.yml
gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId')
```

---

## Manual Deployment

### SSH Access

```bash
ssh -i ~/.ssh/canmp-key.pem ubuntu@13.221.60.79
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
docker-compose logs -f            # Follow all logs
docker-compose logs canmp-app     # App logs only
docker-compose logs canmp-nginx   # Nginx logs
```

### Restart Services

```bash
docker-compose restart            # Restart all
docker-compose restart canmp-app  # Restart app only
```

---

## SSL Certificate Setup

### Fresh Setup (No Certificates)

If nginx fails because SSL certificates don't exist:

```bash
# Create temporary HTTP-only nginx config
cat > /opt/canmp/nginx-http-only.conf << 'EOF'
server {
    listen 80;
    server_name admin.newmainerproject.org localhost;
    location / {
        proxy_pass http://canmp:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Stop problematic nginx
docker stop canmp-nginx 2>/dev/null || true
docker rm canmp-nginx 2>/dev/null || true

# Run temporary HTTP-only nginx
docker run -d --name canmp-nginx-temp --network canmp_default \
  -p 80:80 \
  -v /opt/canmp/nginx-http-only.conf:/etc/nginx/conf.d/default.conf:ro \
  nginx:alpine
```

### Get SSL Certificates

Once DNS is pointing to the server:

```bash
# Stop temporary nginx
docker stop canmp-nginx-temp
docker rm canmp-nginx-temp

# Start full stack (certbot will get certificates)
cd /opt/canmp
docker-compose up -d
```

### Manual Certificate Renewal

```bash
docker-compose run --rm certbot renew
docker-compose exec nginx nginx -s reload
```

---

## Troubleshooting

### App Container Exits

```bash
# Check logs for errors
docker-compose logs canmp-app

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Health Check Fails in CI

Check via SSH:
```bash
curl http://localhost:3000
curl http://localhost:3000/api/health
```

### Nginx Fails to Start

Usually SSL certificate issues. See "SSL Certificate Setup" section above.

### Build Fails with Memory Error

Increase swap space:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### SSH Connection Timeout in GitHub Actions

- Verify EC2 instance is running: `aws ec2 describe-instances --instance-ids <ID>`
- Check security group allows SSH (port 22)
- Verify `EC2_HOST` secret is correct

---

## Rollback

To rollback to a previous version:

```bash
ssh -i ~/.ssh/canmp-key.pem ubuntu@13.221.60.79
cd /opt/canmp

# Find the commit to rollback to
git log --oneline -10

# Reset to specific commit
git reset --hard <COMMIT_HASH>

# Rebuild
docker-compose build --no-cache
docker-compose down --remove-orphans
docker-compose up -d
```

---

## Environment Variables

Environment variables are written to `/opt/canmp/.env` during deployment from GitHub Secrets.

### Update via GitHub (Recommended)
1. Update the secret in GitHub (Settings > Secrets and variables > Actions)
2. Trigger a new deployment

### Update Manually on Server
```bash
nano /opt/canmp/.env
docker-compose restart canmp-app
```

---

## Cost Optimization

| Resource | Estimated Cost |
|----------|---------------|
| EC2 t3.small | ~$15/month |
| Elastic IP (if used) | ~$3.65/month |
| Data transfer | Variable |

**Tips:**
- Release unused Elastic IPs via AWS Console
- Consider Reserved Instances for long-term savings
- Use CloudWatch alarms to monitor costs

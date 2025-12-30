# AWS Amplify Deployment Setup

## Prerequisites
- GitHub repository with your code pushed
- AWS Account with your credentials:
  - Access Key: AKIAQNSCSM2OXSZKRKOD
  - Secret Key: (stored securely)

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Create repository named `canmp`
3. Run these commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/canmp.git
git push -u origin master
```

## Step 2: Set Up AWS Amplify via Console

1. Go to **AWS Amplify Console**: https://console.aws.amazon.com/amplify/
2. Click **"New app"** → **"Host web app"**
3. Select **GitHub** as the source
4. Authorize AWS Amplify to access your GitHub
5. Select your repository: `canmp`
6. Select branch: `master`
7. Amplify will auto-detect Next.js settings

## Step 3: Configure Build Settings

Amplify should auto-detect the `amplify.yml` file, but verify these settings:

**Build Settings:**
- Build command: `npm run build`
- Output directory: `.next`

## Step 4: Add Environment Variables

In Amplify Console → App Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jehanphxddmigpswxtxn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NEON_CRM_ORG_ID` | Your Neon CRM Org ID |
| `NEON_CRM_API_KEY` | Your Neon CRM API Key |
| `SYNC_API_KEY` | Generate a random secure string |

## Step 5: Deploy

Click **"Save and deploy"**. Amplify will:
1. Clone your repository
2. Install dependencies
3. Build the Next.js app
4. Deploy to AWS CloudFront CDN

## Cost Estimate (Under $50/month)

| Service | Free Tier | Estimated Cost |
|---------|-----------|----------------|
| Build minutes | 1,000/month free | ~$0-5 |
| Data transfer | 15 GB/month free | ~$0-5 |
| Hosting | Included | $0 |
| **Total** | | **$5-15/month** |

## Custom Domain (Optional)

1. Go to App Settings → Domain management
2. Add your custom domain
3. Amplify will automatically provision SSL certificate

## Automatic Deployments

After setup, any push to `master` branch will automatically trigger a new deployment!

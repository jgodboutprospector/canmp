# CANMP Disaster Recovery Plan

## Recovery Objectives
- **RTO (Recovery Time Objective):** 2 hours
- **RPO (Recovery Point Objective):** 24 hours

## Critical Components
1. **Application:** Next.js app on EC2
2. **Database:** Supabase PostgreSQL
3. **File Storage:** AWS S3
4. **Domain/SSL:** Let's Encrypt via certbot

---

## Scenario 1: EC2 Instance Failure

### Symptoms
- Application unreachable
- Health check failures
- SSH connection refused

### Recovery Steps

1. **Verify the issue**
   ```bash
   curl -I https://admin.newmainerproject.org/api/health
   ```

2. **Check AWS Console**
   - Go to EC2 Dashboard
   - Check instance state and system logs

3. **If instance is recoverable:**
   ```bash
   aws ec2 reboot-instances --instance-ids i-055e0c6edaf1ab3a3
   ```

4. **If instance needs replacement:**
   ```bash
   # Launch new instance (or use saved AMI)
   # SSH into new instance
   cd /opt && git clone https://github.com/YOUR_ORG/canmp.git
   cd canmp

   # Restore environment variables
   # Copy .env from secure backup or recreate from GitHub secrets

   # Deploy
   docker-compose up -d --build
   ```

5. **Update DNS if IP changed**
   - Update A record for admin.newmainerproject.org

6. **Verify recovery**
   ```bash
   curl https://admin.newmainerproject.org/api/health
   ```

---

## Scenario 2: Database Issues

### Supabase Managed Database
Supabase handles automatic backups. For restoration:

1. **Go to Supabase Dashboard**
   - Project → Settings → Database → Backups

2. **Point-in-time recovery**
   - Available for Pro plan
   - Can restore to any point in last 7 days

3. **Manual backup restoration**
   ```bash
   # If you have a manual backup
   psql $DATABASE_URL < backup.sql
   ```

---

## Scenario 3: Complete AWS Account Compromise

1. **Immediately:**
   - Change AWS root password
   - Rotate all IAM credentials
   - Check CloudTrail for unauthorized access

2. **Recovery:**
   - Create new IAM users/roles
   - Restore EC2 from AMI or redeploy
   - Supabase is independent (different provider)
   - S3 data may need restoration from backups

---

## Backup Procedures

### Database (Supabase)
- Automatic daily backups by Supabase
- Manual: Project → Settings → Database → Download backup

### Application Code
- Stored in GitHub (distributed backup)
- Tag releases for version tracking

### Environment Variables
- Store encrypted copy in secure location
- Document in team password manager

### S3 Files
- Enable versioning on bucket
- Consider cross-region replication for critical data

---

## Contact Information

- **AWS Support:** [AWS Support Center]
- **Supabase Support:** support@supabase.io
- **Domain Registrar:** [Your registrar]

---

## Post-Incident Review

After any incident:
1. Document timeline of events
2. Identify root cause
3. Update this document with lessons learned
4. Implement preventive measures

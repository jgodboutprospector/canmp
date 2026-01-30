# AWS Security Hardening Guide

This document outlines security improvements for the CANMP AWS production deployment.

## Current Infrastructure
- **Instance:** t3.medium EC2 (i-06df99878b7dde82b)
- **Region:** us-east-1
- **Domain:** admin.newmainerproject.org
- **Security Group:** sg-07b56cfaf1a498611

---

## 1. AWS WAF Configuration

Add AWS WAF to protect against common web attacks.

### Option A: CloudFormation Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: WAF rules for CANMP application

Resources:
  WebACL:
    Type: AWS::WAFv2::WebACL
    Properties:
      Name: canmp-web-acl
      Scope: REGIONAL
      DefaultAction:
        Allow: {}
      VisibilityConfig:
        CloudWatchMetricsEnabled: true
        MetricName: canmp-web-acl
        SampledRequestsEnabled: true
      Rules:
        # AWS Managed Rules - Core Rule Set
        - Name: AWS-AWSManagedRulesCommonRuleSet
          Priority: 1
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesCommonRuleSet
          VisibilityConfig:
            CloudWatchMetricsEnabled: true
            MetricName: CommonRuleSet
            SampledRequestsEnabled: true

        # SQL Injection Protection
        - Name: AWS-AWSManagedRulesSQLiRuleSet
          Priority: 2
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesSQLiRuleSet
          VisibilityConfig:
            CloudWatchMetricsEnabled: true
            MetricName: SQLiRuleSet
            SampledRequestsEnabled: true

        # Known Bad Inputs
        - Name: AWS-AWSManagedRulesKnownBadInputsRuleSet
          Priority: 3
          OverrideAction:
            None: {}
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesKnownBadInputsRuleSet
          VisibilityConfig:
            CloudWatchMetricsEnabled: true
            MetricName: KnownBadInputsRuleSet
            SampledRequestsEnabled: true

        # Rate Limiting (100 requests per 5 minutes per IP)
        - Name: RateLimitRule
          Priority: 4
          Action:
            Block: {}
          Statement:
            RateBasedStatement:
              Limit: 100
              AggregateKeyType: IP
          VisibilityConfig:
            CloudWatchMetricsEnabled: true
            MetricName: RateLimitRule
            SampledRequestsEnabled: true
```

### Option B: AWS CLI Commands

```bash
# Create Web ACL with managed rules
aws wafv2 create-web-acl \
  --name canmp-web-acl \
  --scope REGIONAL \
  --default-action Allow={} \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=canmp-web-acl \
  --rules file://waf-rules.json \
  --region us-east-1
```

---

## 2. Security Group Hardening

### Current Security Group Rules (Review Required)

```bash
# View current rules
aws ec2 describe-security-groups --group-ids sg-07b56cfaf1a498611 --region us-east-1
```

### Recommended Rules

```bash
# Allow HTTPS from anywhere (required)
aws ec2 authorize-security-group-ingress \
  --group-id sg-07b56cfaf1a498611 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow HTTP for ACME challenge only (Let's Encrypt)
aws ec2 authorize-security-group-ingress \
  --group-id sg-07b56cfaf1a498611 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# IMPORTANT: Restrict SSH to trusted IPs only
# Replace YOUR_IP with your actual IP address
aws ec2 authorize-security-group-ingress \
  --group-id sg-07b56cfaf1a498611 \
  --protocol tcp \
  --port 22 \
  --cidr YOUR_IP/32

# Remove any 0.0.0.0/0 SSH rules
aws ec2 revoke-security-group-ingress \
  --group-id sg-07b56cfaf1a498611 \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0
```

### Recommended Security Group Configuration

| Type  | Protocol | Port | Source         | Description                |
|-------|----------|------|----------------|----------------------------|
| HTTPS | TCP      | 443  | 0.0.0.0/0      | Public web access          |
| HTTP  | TCP      | 80   | 0.0.0.0/0      | Let's Encrypt renewal      |
| SSH   | TCP      | 22   | YOUR_IP/32     | Admin access (restricted)  |

---

## 3. CloudWatch Monitoring & Alarms

### Create CloudWatch Alarms

```bash
# High CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name canmp-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-06df99878b7dde82b \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:canmp-alerts

# Unusual network traffic alarm
aws cloudwatch put-metric-alarm \
  --alarm-name canmp-network-spike \
  --alarm-description "Alert on unusual network traffic" \
  --metric-name NetworkIn \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 100000000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-06df99878b7dde82b \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:canmp-alerts

# Status check failed alarm
aws cloudwatch put-metric-alarm \
  --alarm-name canmp-status-check-failed \
  --alarm-description "Alert when status checks fail" \
  --metric-name StatusCheckFailed \
  --namespace AWS/EC2 \
  --statistic Maximum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=InstanceId,Value=i-06df99878b7dde82b \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:canmp-alerts
```

### Create SNS Topic for Alerts

```bash
# Create SNS topic
aws sns create-topic --name canmp-alerts --region us-east-1

# Subscribe email to topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:canmp-alerts \
  --protocol email \
  --notification-endpoint admin@newmainerproject.org
```

---

## 4. CloudTrail Configuration

Enable CloudTrail for audit logging:

```bash
# Create S3 bucket for CloudTrail logs
aws s3 mb s3://canmp-cloudtrail-logs --region us-east-1

# Enable CloudTrail
aws cloudtrail create-trail \
  --name canmp-trail \
  --s3-bucket-name canmp-cloudtrail-logs \
  --is-multi-region-trail \
  --enable-log-file-validation

aws cloudtrail start-logging --name canmp-trail
```

---

## 5. Secret Rotation Strategy

### AWS Secrets Manager (Recommended)

```bash
# Create secret for Supabase credentials
aws secretsmanager create-secret \
  --name canmp/supabase \
  --description "Supabase credentials for CANMP" \
  --secret-string '{"url":"...","anon_key":"...","service_role_key":"..."}'

# Create secret for API keys
aws secretsmanager create-secret \
  --name canmp/api-keys \
  --description "Third-party API keys for CANMP" \
  --secret-string '{"neon_api_key":"...","ramp_client_secret":"..."}'
```

### Update Application to Use Secrets Manager

```typescript
// src/lib/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

export async function getSecret(secretName: string): Promise<Record<string, string>> {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return JSON.parse(response.SecretString || '{}');
}
```

---

## 6. Additional Security Recommendations

### Enable IMDSv2 Only

```bash
aws ec2 modify-instance-metadata-options \
  --instance-id i-06df99878b7dde82b \
  --http-tokens required \
  --http-endpoint enabled
```

### Enable EBS Encryption

For new volumes, enable encryption by default:

```bash
aws ec2 enable-ebs-encryption-by-default --region us-east-1
```

### VPC Flow Logs

```bash
# Create flow logs for network monitoring
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-xxxxx \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name canmp-vpc-flow-logs
```

---

## Implementation Priority

1. **Immediate (This Week)**
   - [ ] Restrict SSH in security group to trusted IPs
   - [ ] Enable CloudWatch basic alarms
   - [ ] Create SNS topic for alerts

2. **Short-term (Next Sprint)**
   - [ ] Deploy AWS WAF with managed rules
   - [ ] Enable CloudTrail
   - [ ] Configure VPC Flow Logs

3. **Medium-term (Next Month)**
   - [ ] Migrate secrets to AWS Secrets Manager
   - [ ] Enable IMDSv2 only
   - [ ] Review and rotate all API credentials

---

## Verification Commands

```bash
# Check security group rules
aws ec2 describe-security-groups --group-ids sg-07b56cfaf1a498611

# Check CloudWatch alarms
aws cloudwatch describe-alarms --alarm-name-prefix canmp

# Check WAF Web ACL
aws wafv2 list-web-acls --scope REGIONAL

# Check CloudTrail status
aws cloudtrail get-trail-status --name canmp-trail
```

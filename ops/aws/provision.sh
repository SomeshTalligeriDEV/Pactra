#!/usr/bin/env bash
#
# Stands up the AWS half of Pactra's hosting: an EC2 box for meter + attest
# (neither holds a key), and an S3 + CloudFront pair for the static site and
# console. It does not touch the daemon — that holds the operator key and, by
# this project's own rule in ops/README.md, never runs on a web-facing box.
# It stays on whatever machine already runs it.
#
# Idempotent by name: reruns look each resource up by tag/name first and
# print what exists rather than making a second one. Nothing here deletes.
#
#   ops/aws/provision.sh                # create what's missing, print ids
#   ops/aws/provision.sh --dry-run       # say what would be created, touch nothing
#
set -euo pipefail

REGION=${PACTRA_AWS_REGION:-us-east-1}
NAME=${PACTRA_AWS_NAME:-pactra}
DRY=no
[ "${1:-}" = "--dry-run" ] && DRY=yes

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >&2; }
refuse() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) refusing: $*" >&2; exit 1; }
run() {
  if [ "$DRY" = yes ]; then
    log "[dry-run] $*"
  else
    "$@"
  fi
}

command -v aws >/dev/null || refuse "aws CLI is not installed"
aws sts get-caller-identity >/dev/null 2>&1 ||
  refuse "no working AWS credentials — run 'aws configure --profile pactra' first"

# ---------------------------------------------------------------------------
# S3 bucket for the static site + console bundles.
# ---------------------------------------------------------------------------
BUCKET="${NAME}-site-$(aws sts get-caller-identity --query Account --output text)"

if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  log "s3 bucket $BUCKET already exists"
else
  log "creating s3 bucket $BUCKET"
  if [ "$REGION" = "us-east-1" ]; then
    run aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
  else
    run aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION"
  fi
  # Origin access is via CloudFront's OAC, not a public bucket policy — the
  # bucket itself stays private, matching "no admin key, no shortcut" in
  # spirit: the CDN is the only door, so cache and headers are always applied.
  run aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
    'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'
fi

# ---------------------------------------------------------------------------
# CloudFront distribution in front of the bucket.
# ---------------------------------------------------------------------------
EXISTING_DIST=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='$NAME'].Id" --output text 2>/dev/null || true)

if [ -n "$EXISTING_DIST" ] && [ "$EXISTING_DIST" != "None" ]; then
  log "cloudfront distribution $EXISTING_DIST already exists for comment=$NAME"
else
  log "cloudfront distribution for $BUCKET does not exist yet"
  log "create it once via the console (Origin access control needs a one-time"
  log "bucket policy grant the CLI can also do, but the console wizard is the"
  log "least error-prone way to wire OAC + the bucket policy together)"
fi

# ---------------------------------------------------------------------------
# EC2: one small box for meter + attest, behind nginx. No key ever lands here.
# ---------------------------------------------------------------------------
SG_NAME="${NAME}-sg"
SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SG_NAME" \
  --query "SecurityGroups[0].GroupId" --output text --region "$REGION" 2>/dev/null || true)

if [ -n "$SG_ID" ] && [ "$SG_ID" != "None" ]; then
  log "security group $SG_ID ($SG_NAME) already exists"
else
  VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" \
    --query "Vpcs[0].VpcId" --output text --region "$REGION")
  log "creating security group $SG_NAME in $VPC_ID"
  SG_ID=$(run aws ec2 create-security-group --group-name "$SG_NAME" \
    --description "Pactra meter+attest — no key, no daemon" \
    --vpc-id "$VPC_ID" --region "$REGION" --query GroupId --output text)
  if [ "$DRY" = no ]; then
    # 80/443 for nginx; 22 only if you set PACTRA_ALLOW_SSH — closed by default,
    # since this box's whole job is "nothing valuable lives here."
    run aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" \
      --ip-permissions 'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]' \
                        'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}]'
    if [ -n "${PACTRA_ALLOW_SSH:-}" ]; then
      run aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --region "$REGION" \
        --ip-permissions "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=${PACTRA_ALLOW_SSH}}]"
    fi
  fi
fi

INSTANCE_ID=$(aws ec2 describe-instances --region "$REGION" \
  --filters "Name=tag:Name,Values=$NAME" "Name=instance-state-name,Values=pending,running,stopped" \
  --query "Reservations[0].Instances[0].InstanceId" --output text 2>/dev/null || true)

if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "None" ]; then
  log "ec2 instance $INSTANCE_ID (tag Name=$NAME) already exists"
else
  # Ubuntu, not Amazon Linux: ops/systemd/*.service already assumes
  # User=ubuntu and /home/ubuntu/pactra, matching ops/README's own box.
  # Canonical's owner id is fixed and documented, not guessed.
  AMI_ID=$(aws ec2 describe-images --owners 099720109477 --region "$REGION" \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd*/ubuntu-noble-24.04-amd64-server-*" \
              "Name=state,Values=available" \
    --query "sort_by(Images,&CreationDate)[-1].ImageId" --output text)
  log "launching t3.micro ($AMI_ID) with security group $SG_ID"
  INSTANCE_ID=$(run aws ec2 run-instances --region "$REGION" \
    --image-id "$AMI_ID" --instance-type t3.micro \
    --security-group-ids "$SG_ID" \
    --user-data "file://$(dirname "$0")/ec2-bootstrap.sh" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME}]" \
    --query "Instances[0].InstanceId" --output text)
fi

log "done"
log "  s3 bucket        $BUCKET"
log "  security group    ${SG_ID:-<dry-run>}"
log "  ec2 instance       ${INSTANCE_ID:-<dry-run>}"
log ""
log "next:"
log "  1. wait for the instance to reach 'running', then get its public IP:"
log "       aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION \\"
log "         --query 'Reservations[0].Instances[0].PublicIpAddress' --output text"
log "  2. point DNS at it (see ops/README.md's DNS table)"
log "  3. wire CloudFront to the S3 bucket via the console if it wasn't created above"
log "  4. run ops/aws/deploy-static.sh to build and publish site + console"

#!/usr/bin/env bash
#
# Builds site + console and publishes them to the S3 bucket provision.sh
# created, then invalidates CloudFront so the new build is actually served —
# S3 alone would leave every edge cache serving the previous bundle for
# whatever TTL is set, which looks exactly like a deploy that silently didn't
# take.
#
# Same refusals as ops/bin/pactra-publish.sh, same reason: a destination that
# looks fine but isn't the site, or a console built without base /console/,
# should fail loudly here rather than ship a blank page to CloudFront.
#
#   ops/aws/deploy-static.sh              # build, sync, invalidate
#   ops/aws/deploy-static.sh --dry-run    # build, show what would sync, touch nothing in AWS
#
set -euo pipefail

REGION=${PACTRA_AWS_REGION:-us-east-1}
NAME=${PACTRA_AWS_NAME:-pactra}
DRY=no
[ "${1:-}" = "--dry-run" ] && DRY=yes

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >&2; }
refuse() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) refusing: $*" >&2; exit 1; }

command -v aws >/dev/null || refuse "aws CLI is not installed"
aws sts get-caller-identity >/dev/null 2>&1 || refuse "no working AWS credentials"

REPO=${PACTRA_REPO:-$(cd "$(dirname "$0")/../.." && pwd)}
[ -d "$REPO/packages/site" ] || refuse "$REPO is not the repository (no packages/site)"

BUCKET="${NAME}-site-$(aws sts get-caller-identity --query Account --output text)"
aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null ||
  refuse "s3 bucket $BUCKET does not exist yet — run ops/aws/provision.sh first"

cd "$REPO"
export VITE_METER_URL="${PACTRA_METER_URL:-/api}"

log "building site with meter at $VITE_METER_URL"
npm run build --prefix packages/site
log "building console"
npm run build --prefix packages/console

SITE="$REPO/packages/site/dist"
CONSOLE="$REPO/packages/console/dist"

[ -f "$SITE/index.html" ] || refuse "$SITE/index.html is missing; the site did not build"
[ -f "$CONSOLE/index.html" ] || refuse "$CONSOLE/index.html is missing; the console did not build"
grep -q '/console/assets/' "$CONSOLE/index.html" ||
  refuse "the console bundle does not reference /console/assets/ — it was built without base /console/"

S3_SYNC=(aws s3 sync --delete)
[ "$DRY" = yes ] && S3_SYNC+=(--dryrun)

log "syncing site to s3://$BUCKET/"
"${S3_SYNC[@]}" "$SITE/" "s3://$BUCKET/" --exclude "console/*"
log "syncing console to s3://$BUCKET/console/"
"${S3_SYNC[@]}" "$CONSOLE/" "s3://$BUCKET/console/"

if [ "$DRY" = yes ]; then
  log "dry run, nothing synced, no invalidation requested"
  exit 0
fi

DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='$NAME'].Id" --output text 2>/dev/null || true)

if [ -n "$DIST_ID" ] && [ "$DIST_ID" != "None" ]; then
  log "invalidating cloudfront distribution $DIST_ID"
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null
else
  log "no cloudfront distribution found (comment=$NAME) — bucket updated, but nothing served through a CDN yet"
fi

log "published $(git -C "$REPO" rev-parse --short HEAD)"

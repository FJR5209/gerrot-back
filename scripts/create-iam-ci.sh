#!/usr/bin/env zsh
set -euo pipefail

# Script to create an IAM user for CI with a minimal policy for ECR push.
# Usage:
#   ./scripts/create-iam-ci.sh gerrot-ci
# or
#   IAM_USERNAME=gerrot-ci ./scripts/create-iam-ci.sh
#
# The script will:
# - create an IAM user (if not exists)
# - attach an inline policy named GerrotCIPolicy (document at infra/gerrot-ci-policy.json)
# - create an access key and print export commands for use in CI/GitHub Secrets
#
# SECURITY: The SecretAccessKey will be printed to stdout once. Save it securely and then add to GitHub Secrets.

IAM_USERNAME=${1:-${IAM_USERNAME:-gerrot-ci}}
POLICY_FILE="infra/gerrot-ci-policy.json"

if [[ ! -f "$POLICY_FILE" ]]; then
  echo "Policy file not found: $POLICY_FILE" >&2
  exit 1
fi

command -v aws >/dev/null 2>&1 || { echo >&2 "aws CLI not found. Install and configure it before running this script."; exit 1; }

echo "Creating IAM user: $IAM_USERNAME (if not exists)"
if aws iam get-user --user-name "$IAM_USERNAME" >/dev/null 2>&1; then
  echo "User $IAM_USERNAME already exists."
else
  aws iam create-user --user-name "$IAM_USERNAME"
  echo "User created."
fi

echo "Attaching inline policy 'GerrotCIPolicy' to user $IAM_USERNAME"
aws iam put-user-policy --user-name "$IAM_USERNAME" --policy-name GerrotCIPolicy --policy-document file://$POLICY_FILE

echo "Creating access key for $IAM_USERNAME"
CREDS_JSON=$(aws iam create-access-key --user-name "$IAM_USERNAME")

ACCESS_KEY_ID=$(echo "$CREDS_JSON" | python -c "import sys, json; print(json.load(sys.stdin)['AccessKey']['AccessKeyId'])")
SECRET_ACCESS_KEY=$(echo "$CREDS_JSON" | python -c "import sys, json; print(json.load(sys.stdin)['AccessKey']['SecretAccessKey'])")

cat <<EOF
Access key created for user: $IAM_USERNAME

IMPORTANT: Save the SecretAccessKey now. It will NOT be shown again.

Export commands for your shell (copy & paste to set env vars temporarily):

export AWS_ACCESS_KEY_ID=${ACCESS_KEY_ID}
export AWS_SECRET_ACCESS_KEY=${SECRET_ACCESS_KEY}
export AWS_REGION=${AWS_REGION:-us-east-2}

Recommended next steps:
1) Add these values to your GitHub repository Secrets (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).
   Use the GitHub UI or GH CLI: gh secret set AWS_ACCESS_KEY_ID --body "${ACCESS_KEY_ID}"
2) Validate with: aws sts get-caller-identity
3) When everything is working, consider removing old/compromised keys.

EOF

echo "Done."

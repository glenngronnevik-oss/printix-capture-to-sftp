#!/usr/bin/env bash
set -euo pipefail
ORG="${1:?Usage: $0 <org>}"
REPO="${2:-printix-capture-to-sftp}"
git init && git add . && git commit -m "feat: initial Printix SFTP connector"
gh repo create "$ORG/$REPO" --public --source=. --remote=origin --push
echo "Repo created: https://github.com/$ORG/$REPO"

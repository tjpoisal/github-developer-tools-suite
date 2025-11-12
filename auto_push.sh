#!/bin/bash
set -e

echo "🚀 Pushing GitHub Developer Tools Suite to GitHub..."
echo ""

# Check if we have git credentials configured
if ! git config --global user.name > /dev/null 2>&1; then
    git config --global user.name "TJ Poisal"
    git config --global user.email "tj@poisal.com"
fi

# Get GitHub username from user
echo "Enter your GitHub username:"
read -r GITHUB_USER

# Get repo name
REPO_NAME="github-developer-tools-suite"

# Create repository using GitHub API
echo ""
echo "Creating repository on GitHub..."
echo "You'll need a Personal Access Token with 'repo' scope"
echo "Create one at: https://github.com/settings/tokens/new"
echo ""
echo "Enter your GitHub Personal Access Token:"
read -rs GITHUB_TOKEN

# Create repo via API
curl -X POST -H "Authorization: token $GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/user/repos \
     -d "{\"name\":\"$REPO_NAME\",\"description\":\"AI-Powered GitHub Developer Tools Suite\",\"private\":false}" \
     2>/dev/null | grep -q "full_name" && echo "✅ Repository created!" || echo "ℹ️  Repository may already exist"

# Add remote with token
REPO_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"
git branch -M main

# Push
echo ""
echo "Pushing code to GitHub..."
git push -u origin main --force

echo ""
echo "✅ SUCCESS! Your code is now on GitHub!"
echo ""
echo "🎉 Repository URL: https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo ""
echo "Next steps:"
echo "1. Deploy to Vercel: npm install -g vercel && vercel --prod"
echo "2. Create GitHub App at: https://github.com/settings/apps/new"
echo "3. Submit to Marketplace: Read MARKETPLACE_SUBMISSION.md"
echo ""

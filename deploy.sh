#!/bin/bash

# GitHub Developer Tools Suite - Automated Deployment Script
# This script will help you push to GitHub and deploy to Vercel

set -e  # Exit on error

echo "🚀 GitHub Developer Tools Suite - Deployment Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from the github-developer-tools directory${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: GitHub Repository Setup${NC}"
echo "----------------------------------------"
echo ""
echo "We need to create a GitHub repository and push your code."
echo ""
echo -e "${YELLOW}Do you already have a GitHub repository created?${NC} (y/n)"
read -r HAS_REPO

if [ "$HAS_REPO" = "n" ] || [ "$HAS_REPO" = "N" ]; then
    echo ""
    echo "Please create a GitHub repository manually:"
    echo "1. Go to: https://github.com/new"
    echo "2. Repository name: github-developer-tools-suite"
    echo "3. Description: AI-Powered GitHub Developer Tools Suite with 5 automation tools"
    echo "4. Make it PUBLIC (required for GitHub Marketplace)"
    echo "5. Do NOT initialize with README (we have one)"
    echo "6. Click 'Create repository'"
    echo ""
    echo -e "${YELLOW}Press ENTER when you've created the repository...${NC}"
    read -r
fi

echo ""
echo -e "${YELLOW}Enter your GitHub username:${NC}"
read -r GITHUB_USER

echo -e "${YELLOW}Enter your repository name (default: github-developer-tools-suite):${NC}"
read -r REPO_NAME
REPO_NAME=${REPO_NAME:-github-developer-tools-suite}

# Set remote
REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"

echo ""
echo -e "${BLUE}Adding remote: $REPO_URL${NC}"

# Remove existing remote if it exists
git remote remove origin 2>/dev/null || true

# Add new remote
git remote add origin "$REPO_URL"

# Rename branch to main
git branch -M main

echo ""
echo -e "${GREEN}✅ Remote configured!${NC}"
echo ""

# Push to GitHub
echo -e "${BLUE}Step 2: Pushing to GitHub${NC}"
echo "----------------------------------------"
echo ""
echo "Attempting to push to GitHub..."
echo ""
echo -e "${YELLOW}You may be prompted for your GitHub credentials.${NC}"
echo "If using 2FA, create a Personal Access Token at:"
echo "https://github.com/settings/tokens"
echo ""
echo "Required scopes: repo, workflow"
echo ""

if git push -u origin main; then
    echo ""
    echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
    echo ""
    echo "🎉 Your repository is now live at:"
    echo "   https://github.com/$GITHUB_USER/$REPO_NAME"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Push failed. This might be because:${NC}"
    echo "1. Authentication failed (create a Personal Access Token)"
    echo "2. Repository doesn't exist"
    echo "3. You don't have write permissions"
    echo ""
    echo "Manual push command:"
    echo "   git push -u origin main"
    echo ""
    exit 1
fi

# Deploy to Vercel (optional)
echo -e "${BLUE}Step 3: Deploy to Vercel (Optional)${NC}"
echo "----------------------------------------"
echo ""
echo -e "${YELLOW}Would you like to deploy to Vercel now?${NC} (y/n)"
read -r DEPLOY_VERCEL

if [ "$DEPLOY_VERCEL" = "y" ] || [ "$DEPLOY_VERCEL" = "Y" ]; then
    echo ""
    echo "Installing Vercel CLI..."
    npm install -g vercel || {
        echo -e "${YELLOW}⚠️  Vercel CLI installation failed. Install manually:${NC}"
        echo "   npm install -g vercel"
        echo ""
    }
    
    echo ""
    echo "Deploying to Vercel..."
    echo ""
    vercel --prod || {
        echo ""
        echo -e "${YELLOW}⚠️  Vercel deployment failed. Deploy manually:${NC}"
        echo "1. Install Vercel CLI: npm install -g vercel"
        echo "2. Login: vercel login"
        echo "3. Deploy: vercel --prod"
        echo ""
    }
fi

echo ""
echo -e "${GREEN}=================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "==================================================${NC}"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. View your repository:"
echo "   https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
echo "2. Set up environment variables:"
echo "   - Get Anthropic API key: https://console.anthropic.com"
echo "   - Create GitHub App: https://github.com/settings/apps/new"
echo "   - Set up Stripe: https://stripe.com"
echo ""
echo "3. Deploy to Vercel (if not done):"
echo "   - Import from GitHub"
echo "   - Add environment variables"
echo "   - Deploy!"
echo ""
echo "4. Submit to GitHub Marketplace:"
echo "   - Read MARKETPLACE_SUBMISSION.md"
echo "   - Create demo video"
echo "   - Submit at: https://github.com/marketplace/new"
echo ""
echo "5. Start getting customers! 💰"
echo ""
echo "📚 Documentation:"
echo "   - Quick Start: QUICK_START.md"
echo "   - Full Setup: SETUP.md"
echo "   - Package Summary: PACKAGE_SUMMARY.md"
echo ""
echo "💡 Questions? Email: tj@poisal.com"
echo ""
echo -e "${GREEN}Good luck building your $10M+ company! 🚀${NC}"

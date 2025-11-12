#!/bin/bash
echo "🚀 Deploying to Vercel..."
echo ""
echo "This will deploy your GitHub Developer Tools Suite"
echo ""

# Check if vercel is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "Your tools are now live!"

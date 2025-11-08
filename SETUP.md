# GitHub Developer Tools Suite - Setup Guide

## 🚀 Quick Deployment to GitHub Developer Program

### Prerequisites
- GitHub account with developer program access
- Anthropic API key (get at: https://console.anthropic.com)
- Stripe account (for billing)
- Vercel account (for hosting)
- PostgreSQL database (Supabase, Railway, or Neon)

---

## Step 1: Clone & Install

```bash
git clone https://github.com/tjpoisal/github-developer-tools-suite.git
cd github-developer-tools-suite
npm install
```

---

## Step 2: Create GitHub App

### Option A: Automated Setup (Recommended)

1. Go to: https://github.com/settings/apps/new?state=setup

2. Use this manifest URL:
   ```
   https://your-domain.vercel.app/config/github-app-manifest.json
   ```

3. GitHub will automatically configure:
   - Webhook URL
   - Permissions
   - Event subscriptions

### Option B: Manual Setup

1. Navigate to: https://github.com/settings/apps/new

2. Configure basic information:
   ```
   GitHub App name: [Your Tool Name]
   Homepage URL: https://your-domain.vercel.app
   Webhook URL: https://your-domain.vercel.app/webhooks/github
   Webhook secret: [Generate strong random string]
   ```

3. Set Permissions:
   ```
   Repository permissions:
   - Contents: Read & write
   - Issues: Read & write
   - Pull requests: Read & write
   - Metadata: Read-only
   ```

4. Subscribe to events:
   ```
   - Pull request
   - Pull request review
   - Push
   - Issues
   ```

5. Create the app and download the private key

6. Note your App ID from the settings page

---

## Step 3: Database Setup

### Using Supabase (Recommended)

1. Create project at: https://supabase.com

2. Run the schema:
   ```bash
   psql $DATABASE_URL -f database/schema.sql
   ```

3. Copy connection string from Supabase settings

### Using Railway

1. Create project at: https://railway.app

2. Add PostgreSQL plugin

3. Run schema via Railway dashboard or CLI

### Using Neon

1. Create project at: https://neon.tech

2. Execute schema in SQL editor

---

## Step 4: Configure Environment Variables

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# GitHub App
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
YOUR_PRIVATE_KEY_HERE
-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis (optional, for caching)
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=production
```

---

## Step 5: Deploy to Vercel

### Option A: CLI Deployment

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B: GitHub Integration

1. Push code to GitHub:
   ```bash
   git remote add origin https://github.com/yourusername/github-dev-tools.git
   git push -u origin main
   ```

2. Import to Vercel:
   - Go to https://vercel.com/new
   - Select your repository
   - Vercel auto-detects configuration

3. Add environment variables in Vercel dashboard

### Option C: Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tjpoisal/github-developer-tools-suite)

---

## Step 6: Configure Stripe Billing

1. Create products in Stripe Dashboard:
   ```
   Starter Plan: $199/month
   Professional Plan: $499/month
   Enterprise Plan: $1,299/month
   ```

2. Set up webhook:
   - URL: `https://your-domain.vercel.app/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.deleted`

3. Copy webhook secret to `.env`

---

## Step 7: Test Installation

1. Install your GitHub App on a test repository

2. Create a test pull request

3. Watch the AI review appear automatically

4. Check logs:
   ```bash
   vercel logs
   ```

---

## Verification Checklist

- [ ] GitHub App created and installed
- [ ] Webhook URL receiving events
- [ ] Database connected and schema applied
- [ ] Anthropic API key working
- [ ] Stripe products created
- [ ] Vercel deployment successful
- [ ] Landing page accessible
- [ ] Test PR reviewed automatically
- [ ] Documentation generated on push
- [ ] Issue triaged automatically

---

## Submit to GitHub Developer Program

Once everything is working:

1. **Prepare Submission Materials**:
   - Screenshots of tools in action
   - Video demo (2-3 minutes)
   - README with clear value proposition
   - Pricing information
   - Support documentation

2. **GitHub Marketplace Listing**:
   - Go to: https://github.com/marketplace/new
   - Fill in listing details
   - Upload screenshots and demo
   - Set pricing tiers
   - Submit for review

3. **Developer Program Application**:
   - Apply at: https://github.com/marketplace/developer-application
   - Include:
     * Description of your tools
     * Target audience
     * Value proposition
     * Revenue projections
     * Support plan

4. **Marketing Assets**:
   - Landing page (already created at `/public/index.html`)
   - Documentation site
   - Blog post announcing launch
   - Social media posts

---

## Monitoring & Analytics

### Usage Tracking

View analytics dashboard:
```
https://your-domain.vercel.app/dashboard
```

Key metrics:
- Reviews performed
- Documentation updates
- Issues triaged
- Migrations completed
- Conflicts resolved
- Active installations
- Revenue

### Performance Monitoring

```bash
# View real-time logs
vercel logs --follow

# Check database stats
psql $DATABASE_URL -c "SELECT * FROM customer_analytics;"

# Monitor API usage
curl https://your-domain.vercel.app/health
```

---

## Scaling Considerations

### When you hit 100 customers:

1. **Optimize Database**:
   - Add connection pooling
   - Implement caching layer
   - Archive old logs

2. **Rate Limiting**:
   - Implement per-customer limits
   - Queue system for migrations
   - Throttle webhook processing

3. **Infrastructure**:
   - Upgrade Vercel plan
   - Scale database
   - Add Redis cluster

### When you hit 1,000 customers:

1. **Microservices Architecture**:
   - Separate each tool into its own service
   - Dedicated webhook processor
   - Async job queue (Bull, Celery)

2. **Enterprise Features**:
   - Custom integrations
   - White-label options
   - On-premise deployment

---

## Troubleshooting

### Webhooks not received
```bash
# Check webhook delivery in GitHub
Settings → Developer settings → GitHub Apps → [Your App] → Advanced → Recent Deliveries

# Verify webhook URL is accessible
curl -X POST https://your-domain.vercel.app/webhooks/github
```

### API rate limits
```javascript
// Implement retry logic in server.js
const octokit = new Octokit({
  auth: token,
  throttle: {
    onRateLimit: (retryAfter, options) => {
      console.warn(`Rate limit hit, retrying after ${retryAfter}s`);
      return true;
    }
  }
});
```

### Database connection issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
# Add to server.js:
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

---

## Support

- **Documentation**: https://docs.your-site.com
- **Issues**: https://github.com/tjpoisal/github-developer-tools-suite/issues
- **Email**: support@your-domain.com
- **Discord**: https://discord.gg/your-server

---

## Next Steps

1. **Beta Testing**:
   - Recruit 10-20 beta users
   - Gather feedback
   - Iterate on features

2. **Marketing**:
   - Launch on Product Hunt
   - Post on Hacker News
   - Share on Twitter/LinkedIn
   - Create demo videos

3. **Iterate**:
   - Add requested features
   - Improve AI prompts
   - Optimize performance
   - Expand integrations

---

**Ready to make money? Let's get your GitHub App live! 🚀**

Questions? Contact: tj@poisal.com

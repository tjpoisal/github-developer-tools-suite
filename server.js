const express = require('express');
const { Webhooks } = require('@octokit/webhooks');
const { Octokit } = require('@octokit/rest');
const Anthropic = require('@anthropic-ai/sdk');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const winston = require('winston');
const Stripe = require('stripe');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const webhooks = new Webhooks({ secret: process.env.GITHUB_WEBHOOK_SECRET });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    tools: [
      'code-reviewer',
      'doc-generator', 
      'project-manager',
      'code-migrator',
      'merge-resolver'
    ]
  });
});

// GitHub App authentication
function generateJWT() {
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600,
    iss: process.env.GITHUB_APP_ID
  };
  
  return jwt.sign(payload, process.env.GITHUB_PRIVATE_KEY, { algorithm: 'RS256' });
}

async function getInstallationOctokit(installationId) {
  const appOctokit = new Octokit({ auth: generateJWT() });
  
  const { data: { token } } = await appOctokit.apps.createInstallationAccessToken({
    installation_id: installationId
  });
  
  return new Octokit({ auth: token });
}

// Tool 1: AI Code Review Assistant
webhooks.on('pull_request.opened', async ({ payload }) => {
  try {
    logger.info(`PR opened: ${payload.pull_request.html_url}`);
    
    const octokit = await getInstallationOctokit(payload.installation.id);
    const { owner, repo } = payload.repository;
    const prNumber = payload.pull_request.number;
    
    // Get PR diff
    const { data: files } = await octokit.pulls.listFiles({
      owner: owner.login,
      repo: repo.name,
      pull_number: prNumber
    });
    
    // Analyze each file with Claude
    for (const file of files) {
      if (file.patch) {
        const review = await analyzeCode(file.filename, file.patch);
        
        if (review.comments.length > 0) {
          // Post review comments
          await octokit.pulls.createReview({
            owner: owner.login,
            repo: repo.name,
            pull_number: prNumber,
            event: 'COMMENT',
            body: review.summary,
            comments: review.comments
          });
        }
      }
    }
    
    logger.info(`Code review completed for PR #${prNumber}`);
  } catch (error) {
    logger.error('Code review error:', error);
  }
});

async function analyzeCode(filename, patch) {
  const prompt = `Analyze this code change and identify:
1. Security vulnerabilities
2. Performance issues
3. Best practice violations
4. Potential bugs
5. Suggestions for improvement

File: ${filename}
Changes:
\`\`\`
${patch}
\`\`\`

Provide specific line-by-line feedback in JSON format:
{
  "summary": "overall assessment",
  "comments": [
    {
      "path": "filename",
      "line": line_number,
      "body": "specific feedback"
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return JSON.parse(message.content[0].text);
}

// Tool 2: Documentation Generator
webhooks.on('push', async ({ payload }) => {
  if (payload.ref !== 'refs/heads/main') return;
  
  try {
    logger.info(`Push to main: ${payload.repository.full_name}`);
    
    const octokit = await getInstallationOctokit(payload.installation.id);
    const { owner, repo } = payload.repository;
    
    // Get all code files
    const { data: tree } = await octokit.git.getTree({
      owner: owner.name,
      repo: repo.name,
      tree_sha: 'HEAD',
      recursive: true
    });
    
    // Generate documentation
    const docs = await generateDocumentation(octokit, owner.name, repo.name, tree.tree);
    
    // Update README and create docs
    await updateDocs(octokit, owner.name, repo.name, docs);
    
    logger.info(`Documentation updated for ${repo.name}`);
  } catch (error) {
    logger.error('Documentation generation error:', error);
  }
});

async function generateDocumentation(octokit, owner, repo, files) {
  const codeFiles = files.filter(f => 
    f.type === 'blob' && 
    (f.path.endsWith('.js') || f.path.endsWith('.ts') || f.path.endsWith('.py'))
  );
  
  let allCode = '';
  for (const file of codeFiles.slice(0, 20)) { // Limit to prevent token overflow
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: file.path
    });
    
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    allCode += `\n\n// ${file.path}\n${content}`;
  }
  
  const prompt = `Analyze this codebase and generate comprehensive documentation:

${allCode}

Generate:
1. Project overview
2. Architecture description
3. API documentation
4. Setup instructions
5. Usage examples
6. Contributing guidelines

Format as Markdown.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return message.content[0].text;
}

async function updateDocs(octokit, owner, repo, docs) {
  // Update README.md
  try {
    const { data: readme } = await octokit.repos.getContent({
      owner,
      repo,
      path: 'README.md'
    });
    
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: '📝 Auto-generated documentation update',
      content: Buffer.from(docs).toString('base64'),
      sha: readme.sha
    });
  } catch (error) {
    // Create new README if doesn't exist
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: 'README.md',
      message: '📝 Auto-generated documentation',
      content: Buffer.from(docs).toString('base64')
    });
  }
}

// Tool 3: Project Manager Bot
webhooks.on('issues.opened', async ({ payload }) => {
  try {
    logger.info(`New issue: ${payload.issue.html_url}`);
    
    const octokit = await getInstallationOctokit(payload.installation.id);
    const { owner, repo } = payload.repository;
    const issue = payload.issue;
    
    // Analyze and triage issue
    const triage = await triageIssue(issue.title, issue.body);
    
    // Apply labels
    await octokit.issues.addLabels({
      owner: owner.login,
      repo: repo.name,
      issue_number: issue.number,
      labels: triage.labels
    });
    
    // Assign if possible
    if (triage.assignee) {
      await octokit.issues.addAssignees({
        owner: owner.login,
        repo: repo.name,
        issue_number: issue.number,
        assignees: [triage.assignee]
      });
    }
    
    // Add comment with analysis
    await octokit.issues.createComment({
      owner: owner.login,
      repo: repo.name,
      issue_number: issue.number,
      body: triage.comment
    });
    
    logger.info(`Issue triaged: #${issue.number}`);
  } catch (error) {
    logger.error('Issue triage error:', error);
  }
});

async function triageIssue(title, body) {
  const prompt = `Analyze this GitHub issue and provide:
1. Appropriate labels (bug, feature, enhancement, documentation, etc.)
2. Priority level (critical, high, medium, low)
3. Estimated complexity (1-10)
4. Suggested assignee type (frontend, backend, devops, etc.)
5. Brief analysis

Issue: ${title}
Description: ${body}

Return JSON:
{
  "labels": ["label1", "label2"],
  "priority": "medium",
  "complexity": 5,
  "assignee_type": "backend",
  "comment": "analysis and recommendations"
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return JSON.parse(message.content[0].text);
}

// Tool 4: Code Migration & Modernization
app.post('/api/migrate', async (req, res) => {
  try {
    const { repo_url, from_framework, to_framework, installation_id } = req.body;
    
    logger.info(`Migration request: ${from_framework} → ${to_framework}`);
    
    // Parse repo info
    const [owner, repo] = repo_url.split('/').slice(-2);
    const octokit = await getInstallationOctokit(installation_id);
    
    // Get repository files
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: true
    });
    
    // Migrate files
    const migrations = await migrateCodebase(octokit, owner, repo, tree.tree, from_framework, to_framework);
    
    // Create migration branch
    const branchName = `migrate-${from_framework}-to-${to_framework}-${Date.now()}`;
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: 'heads/main'
    });
    
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha
    });
    
    // Apply migrations
    for (const migration of migrations) {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: migration.path,
        message: `🔄 Migrate ${migration.path} to ${to_framework}`,
        content: Buffer.from(migration.content).toString('base64'),
        branch: branchName
      });
    }
    
    // Create PR
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title: `🔄 Migrate from ${from_framework} to ${to_framework}`,
      head: branchName,
      base: 'main',
      body: `Automated migration generated by AI Code Migrator\n\n${migrations.length} files migrated.`
    });
    
    res.json({ 
      success: true, 
      pr_url: pr.html_url,
      files_migrated: migrations.length
    });
    
  } catch (error) {
    logger.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function migrateCodebase(octokit, owner, repo, files, fromFramework, toFramework) {
  const migrations = [];
  
  for (const file of files.filter(f => f.type === 'blob' && f.path.endsWith('.js'))) {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: file.path
    });
    
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    
    const prompt = `Migrate this code from ${fromFramework} to ${toFramework}:

\`\`\`javascript
${content}
\`\`\`

Return ONLY the migrated code, no explanations.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    migrations.push({
      path: file.path,
      content: message.content[0].text
    });
  }
  
  return migrations;
}

// Tool 5: Intelligent Merge Conflict Resolver
webhooks.on('pull_request.synchronize', async ({ payload }) => {
  try {
    const octokit = await getInstallationOctokit(payload.installation.id);
    const { owner, repo } = payload.repository;
    const prNumber = payload.pull_request.number;
    
    // Check for conflicts
    const { data: pr } = await octokit.pulls.get({
      owner: owner.login,
      repo: repo.name,
      pull_number: prNumber
    });
    
    if (pr.mergeable_state === 'dirty') {
      logger.info(`Resolving conflicts for PR #${prNumber}`);
      
      // Get conflicted files
      const { data: files } = await octokit.pulls.listFiles({
        owner: owner.login,
        repo: repo.name,
        pull_number: prNumber
      });
      
      const resolutions = [];
      
      for (const file of files) {
        if (file.status === 'modified') {
          const resolution = await resolveConflict(octokit, owner.login, repo.name, file.filename, pr.head.ref, pr.base.ref);
          if (resolution) {
            resolutions.push(resolution);
          }
        }
      }
      
      // Comment with resolution suggestions
      if (resolutions.length > 0) {
        await octokit.issues.createComment({
          owner: owner.login,
          repo: repo.name,
          issue_number: prNumber,
          body: `## 🤖 AI Conflict Resolution

I've analyzed the merge conflicts and here are my suggestions:

${resolutions.map(r => `### ${r.file}
\`\`\`
${r.resolution}
\`\`\`
**Reasoning:** ${r.reasoning}
`).join('\n')}`
        });
      }
    }
  } catch (error) {
    logger.error('Conflict resolution error:', error);
  }
});

async function resolveConflict(octokit, owner, repo, filename, headBranch, baseBranch) {
  try {
    // Get both versions
    const [headFile, baseFile] = await Promise.all([
      octokit.repos.getContent({ owner, repo, path: filename, ref: headBranch }),
      octokit.repos.getContent({ owner, repo, path: filename, ref: baseBranch })
    ]);
    
    const headContent = Buffer.from(headFile.data.content, 'base64').toString('utf8');
    const baseContent = Buffer.from(baseFile.data.content, 'base64').toString('utf8');
    
    const prompt = `Resolve this merge conflict intelligently:

BASE VERSION:
\`\`\`
${baseContent}
\`\`\`

HEAD VERSION:
\`\`\`
${headContent}
\`\`\`

Provide:
1. Resolved code that preserves intent from both versions
2. Reasoning for resolution choices

Return JSON:
{
  "resolved_code": "the merged code",
  "reasoning": "explanation of resolution strategy"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const result = JSON.parse(message.content[0].text);
    
    return {
      file: filename,
      resolution: result.resolved_code,
      reasoning: result.reasoning
    };
  } catch (error) {
    logger.error(`Error resolving conflict in ${filename}:`, error);
    return null;
  }
}

// Stripe billing webhooks
app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      // Enable features for customer
      await enableFeatures(event.data.object);
      break;
    case 'customer.subscription.deleted':
      // Disable features
      await disableFeatures(event.data.object);
      break;
  }
  
  res.json({ received: true });
});

async function enableFeatures(session) {
  logger.info(`Subscription activated: ${session.customer}`);
  // Store in database
}

async function disableFeatures(subscription) {
  logger.info(`Subscription cancelled: ${subscription.customer}`);
  // Remove from database
}

// Webhook endpoint
app.post('/webhooks/github', async (req, res) => {
  try {
    await webhooks.verifyAndReceive({
      id: req.headers['x-github-delivery'],
      name: req.headers['x-github-event'],
      signature: req.headers['x-hub-signature-256'],
      payload: JSON.stringify(req.body)
    });
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`GitHub Developer Tools Suite running on port ${PORT}`);
  logger.info('Tools active:');
  logger.info('  ✓ AI Code Review Assistant');
  logger.info('  ✓ Documentation Generator');
  logger.info('  ✓ Project Manager Bot');
  logger.info('  ✓ Code Migration Tool');
  logger.info('  ✓ Merge Conflict Resolver');
});

module.exports = app;

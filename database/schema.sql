-- GitHub Developer Tools Suite Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_org VARCHAR(255) UNIQUE NOT NULL,
    github_installation_id INTEGER UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255) UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'starter', -- starter, professional, enterprise
    subscription_status VARCHAR(50) DEFAULT 'trial', -- trial, active, cancelled, past_due
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage tracking
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    tool_name VARCHAR(100) NOT NULL, -- code-reviewer, doc-generator, etc.
    action VARCHAR(100) NOT NULL, -- pr_review, doc_update, issue_triage, etc.
    repository VARCHAR(255) NOT NULL,
    metadata JSONB, -- Additional context
    tokens_used INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Code reviews
CREATE TABLE code_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    repository VARCHAR(255) NOT NULL,
    pr_number INTEGER NOT NULL,
    pr_url TEXT NOT NULL,
    files_reviewed INTEGER DEFAULT 0,
    comments_made INTEGER DEFAULT 0,
    issues_found INTEGER DEFAULT 0,
    severity_critical INTEGER DEFAULT 0,
    severity_high INTEGER DEFAULT 0,
    severity_medium INTEGER DEFAULT 0,
    severity_low INTEGER DEFAULT 0,
    review_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documentation updates
CREATE TABLE documentation_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    repository VARCHAR(255) NOT NULL,
    commit_sha VARCHAR(40),
    files_updated INTEGER DEFAULT 0,
    lines_generated INTEGER DEFAULT 0,
    doc_type VARCHAR(50), -- readme, api, architecture, setup
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issue triage
CREATE TABLE issue_triages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    repository VARCHAR(255) NOT NULL,
    issue_number INTEGER NOT NULL,
    issue_url TEXT NOT NULL,
    labels_applied TEXT[],
    priority VARCHAR(20),
    complexity INTEGER,
    assignee_suggested VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Code migrations
CREATE TABLE code_migrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    repository VARCHAR(255) NOT NULL,
    from_framework VARCHAR(100) NOT NULL,
    to_framework VARCHAR(100) NOT NULL,
    files_migrated INTEGER DEFAULT 0,
    lines_changed INTEGER DEFAULT 0,
    pr_url TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Merge conflicts
CREATE TABLE merge_resolutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    repository VARCHAR(255) NOT NULL,
    pr_number INTEGER NOT NULL,
    pr_url TEXT NOT NULL,
    files_with_conflicts INTEGER DEFAULT 0,
    conflicts_resolved INTEGER DEFAULT 0,
    resolution_strategy TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Billing events
CREATE TABLE billing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    event_type VARCHAR(100) NOT NULL, -- subscription_created, payment_succeeded, etc.
    stripe_event_id VARCHAR(255) UNIQUE,
    amount INTEGER, -- in cents
    currency VARCHAR(3) DEFAULT 'USD',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_usage_logs_customer ON usage_logs(customer_id);
CREATE INDEX idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX idx_code_reviews_customer ON code_reviews(customer_id);
CREATE INDEX idx_code_reviews_repo ON code_reviews(repository);
CREATE INDEX idx_issue_triages_customer ON issue_triages(customer_id);
CREATE INDEX idx_migrations_customer ON code_migrations(customer_id);
CREATE INDEX idx_merge_resolutions_customer ON merge_resolutions(customer_id);
CREATE INDEX idx_billing_events_customer ON billing_events(customer_id);

-- View for customer analytics
CREATE VIEW customer_analytics AS
SELECT 
    c.id,
    c.github_org,
    c.subscription_tier,
    c.subscription_status,
    COUNT(DISTINCT cr.id) as total_reviews,
    COUNT(DISTINCT du.id) as total_doc_updates,
    COUNT(DISTINCT it.id) as total_issue_triages,
    COUNT(DISTINCT cm.id) as total_migrations,
    COUNT(DISTINCT mr.id) as total_merge_resolutions,
    SUM(ul.tokens_used) as total_tokens_used,
    c.created_at as customer_since
FROM customers c
LEFT JOIN code_reviews cr ON c.id = cr.customer_id
LEFT JOIN documentation_updates du ON c.id = du.customer_id
LEFT JOIN issue_triages it ON c.id = it.customer_id
LEFT JOIN code_migrations cm ON c.id = cm.customer_id
LEFT JOIN merge_resolutions mr ON c.id = mr.customer_id
LEFT JOIN usage_logs ul ON c.id = ul.customer_id
GROUP BY c.id;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for customers table
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Initial seed data for testing
INSERT INTO customers (github_org, github_installation_id, subscription_tier, subscription_status) 
VALUES ('test-org', 12345, 'professional', 'trial');

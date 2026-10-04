-- Cloudflare D1 Migration: 0003_financial_indexes.sql
-- High-Performance Indexes for Scale and Instant Ledger Lookups

-- Members & Accounts
CREATE INDEX IF NOT EXISTS idx_members_mobile ON members(mobile_phone);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(account_status, membership_status);
CREATE INDEX IF NOT EXISTS idx_savings_member ON savings_accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_savings_account_no ON savings_accounts(account_number);

-- Transactions & Ledgers
CREATE INDEX IF NOT EXISTS idx_savings_tx_member ON savings_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_savings_tx_date ON savings_transactions(date);
CREATE INDEX IF NOT EXISTS idx_contributions_member ON contributions(member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_period ON contributions(year_bs, month_bs);
CREATE INDEX IF NOT EXISTS idx_contributions_date ON contributions(payment_date);

-- Loans & Repayments
CREATE INDEX IF NOT EXISTS idx_loans_member ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_repayments_loan ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayments_member ON loan_repayments(member_id);
CREATE INDEX IF NOT EXISTS idx_repayments_date ON loan_repayments(payment_date);

-- Sessions & Security
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON login_attempts(attempt_key);

-- Notifications & Audit
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_role, recipient_member_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_general_ledger_date ON general_ledger(entry_date);
CREATE INDEX IF NOT EXISTS idx_general_ledger_code ON general_ledger(account_code);

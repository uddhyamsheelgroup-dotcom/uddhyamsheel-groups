-- Cloudflare D1 Migration: 0002_security.sql
-- Security Hardening, Rate Limiting & Account Protection

-- Persistent Brute Force Protection Table
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  attempt_key TEXT UNIQUE NOT NULL, -- ip:xxx or id:xxx
  attempt_count INTEGER NOT NULL DEFAULT 1,
  locked_until INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT NOT NULL
);

-- Ensure receipt numbers are globally unique in savings, contributions, and repayments
CREATE UNIQUE INDEX IF NOT EXISTS idx_savings_receipt ON savings_transactions(receipt_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contributions_receipt ON contributions(receipt_no);
CREATE UNIQUE INDEX IF NOT EXISTS idx_repayments_receipt ON loan_repayments(receipt_no);

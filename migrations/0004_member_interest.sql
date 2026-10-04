-- Cloudflare D1 Migration: 0004_member_interest.sql
-- Dedicated Member Interest & Financial Aggregations

-- View: Authoritative Member Interest & Repayment Summary
CREATE VIEW IF NOT EXISTS v_member_loan_summary AS
SELECT 
  l.member_id,
  COUNT(DISTINCT l.id) AS total_loans_count,
  COALESCE(SUM(l.principal_amount), 0.0) AS total_loan_principal,
  COALESCE(SUM(r.principal_amount), 0.0) AS total_principal_paid,
  COALESCE(SUM(r.interest_amount), 0.0) AS total_interest_paid,
  COALESCE(SUM(r.penalty_amount), 0.0) AS total_penalty_paid,
  COALESCE(SUM(r.total_amount), 0.0) AS total_payments_made
FROM loans l
LEFT JOIN loan_repayments r ON l.id = r.loan_id
GROUP BY l.member_id;

-- View: Authoritative Member Savings Summary
CREATE VIEW IF NOT EXISTS v_member_savings_summary AS
SELECT
  s.member_id,
  s.account_number,
  s.balance AS current_savings_balance,
  s.interest_accumulated,
  COALESCE((SELECT SUM(c.amount) FROM contributions c WHERE c.member_id = s.member_id AND c.status = 'PAID'), 0.0) AS total_contributions_paid
FROM savings_accounts s;

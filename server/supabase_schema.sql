-- ====================================================================
-- UDDHYAMSHEEL GROUP MANAGEMENT SYSTEM
-- PostgreSQL / Supabase Complete Authoritative Schema
-- Organization: Uddhyamsheel Group (Estd. 2079 B.S., Lumbini Nepal)
-- ====================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. System & Organization Settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Administrator Accounts
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Members Master Table
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  dob TEXT,
  gender TEXT,
  citizenship_no TEXT,
  address TEXT NOT NULL,
  mobile_phone TEXT NOT NULL,
  email TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  membership_type TEXT NOT NULL,
  membership_date TEXT NOT NULL,
  account_status TEXT NOT NULL DEFAULT 'ACTIVE',
  membership_status TEXT NOT NULL DEFAULT 'ACTIVE',
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Savings Accounts
CREATE TABLE IF NOT EXISTS savings_accounts (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  account_number TEXT UNIQUE NOT NULL,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Savings Transactions
CREATE TABLE IF NOT EXISTS savings_transactions (
  id TEXT PRIMARY KEY,
  receipt_no TEXT UNIQUE NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  account_id TEXT NOT NULL REFERENCES savings_accounts(id) ON DELETE RESTRICT,
  type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Monthly Contributions
CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  receipt_no TEXT UNIQUE NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  year_bs INTEGER NOT NULL,
  month_bs INTEGER NOT NULL,
  month_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Loans
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  application_date TEXT NOT NULL,
  approval_date TEXT,
  disbursement_date TEXT,
  loan_amount NUMERIC(12, 2) NOT NULL,
  interest_rate NUMERIC(5, 2) NOT NULL,
  interest_method TEXT NOT NULL DEFAULT 'REDUCING_BALANCE',
  term_months INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  principal_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  interest_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  remaining_principal NUMERIC(12, 2) NOT NULL,
  remaining_interest NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  cleared_at TEXT,
  purpose TEXT,
  guarantor_name TEXT,
  guarantor_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Loan Repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
  id TEXT PRIMARY KEY,
  receipt_no TEXT UNIQUE NOT NULL,
  loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  payment_date TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  principal_amount NUMERIC(12, 2) NOT NULL,
  interest_amount NUMERIC(12, 2) NOT NULL,
  penalty_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL,
  remaining_principal_after NUMERIC(12, 2) NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Profit Distributions
CREATE TABLE IF NOT EXISTS profit_distributions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_interest_income NUMERIC(12, 2) NOT NULL,
  total_distributable_amount NUMERIC(12, 2) NOT NULL,
  eligible_member_count INTEGER NOT NULL,
  share_per_member NUMERIC(12, 2) NOT NULL,
  distribution_date TEXT NOT NULL,
  distribution_method TEXT NOT NULL DEFAULT 'EQUAL_SHARE',
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Cash & Bank Accounts
CREATE TABLE IF NOT EXISTS cash_bank_accounts (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  type TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Cash & Bank Transactions
CREATE TABLE IF NOT EXISTS cash_bank_transactions (
  id TEXT PRIMARY KEY,
  receipt_no TEXT,
  account_id TEXT NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  reference_account_id TEXT,
  reference_id TEXT,
  description TEXT,
  date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. General Ledger
CREATE TABLE IF NOT EXISTS general_ledger (
  id TEXT PRIMARY KEY,
  transaction_date TEXT NOT NULL,
  reference_no TEXT,
  account_name TEXT NOT NULL,
  account_category TEXT NOT NULL,
  debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  entity_type TEXT,
  entity_id TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Investments
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  investment_type TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  investment_date TEXT NOT NULL,
  expected_return_rate NUMERIC(5, 2),
  expected_return_amount NUMERIC(12, 2),
  actual_return_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  maturity_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. Assets and Liabilities
CREATE TABLE IF NOT EXISTS assets_liabilities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  acquisition_date TEXT NOT NULL,
  original_amount NUMERIC(12, 2) NOT NULL,
  current_value NUMERIC(12, 2) NOT NULL,
  due_date TEXT,
  depreciation_rate NUMERIC(5, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. Member Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  upload_date TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  notes TEXT
);

-- 16. Official Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  certificate_no TEXT UNIQUE NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  historical_membership_date TEXT NOT NULL,
  signatory TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ISSUED',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_type TEXT NOT NULL,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  description TEXT NOT NULL,
  ip_address TEXT
);

-- 19. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  member_id TEXT,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

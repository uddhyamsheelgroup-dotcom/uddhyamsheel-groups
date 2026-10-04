-- Cloudflare D1 Migration: 0001_initial_schema.sql
-- Authoritative Schema for Uddhyamsheel Group Management System

-- 1. System Settings & Configuration
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Administrators
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Members
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  dob TEXT,
  gender TEXT DEFAULT 'Other',
  citizenship_no TEXT,
  address TEXT NOT NULL,
  mobile_phone TEXT NOT NULL,
  email TEXT,
  emergency_name TEXT,
  emergency_phone TEXT,
  membership_type TEXT DEFAULT 'General Member',
  membership_date TEXT NOT NULL,
  account_status TEXT DEFAULT 'ACTIVE',
  membership_status TEXT DEFAULT 'ACTIVE',
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 4. Savings Accounts
CREATE TABLE IF NOT EXISTS savings_accounts (
  id TEXT PRIMARY KEY,
  member_id TEXT UNIQUE NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  account_number TEXT UNIQUE NOT NULL,
  balance REAL DEFAULT 0.0,
  interest_accumulated REAL DEFAULT 0.0,
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Savings Transactions
CREATE TABLE IF NOT EXISTS savings_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES savings_accounts(id) ON DELETE RESTRICT,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  type TEXT NOT NULL, -- DEPOSIT, WITHDRAWAL, INTEREST_CREDIT
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  date TEXT NOT NULL,
  receipt_no TEXT NOT NULL,
  payment_method TEXT DEFAULT 'CASH',
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);

-- 6. Monthly Contributions
CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  year_bs INTEGER NOT NULL,
  month_bs INTEGER NOT NULL,
  amount REAL NOT NULL,
  late_fee REAL DEFAULT 0.0,
  payment_date TEXT NOT NULL,
  receipt_no TEXT NOT NULL,
  payment_method TEXT DEFAULT 'CASH',
  status TEXT DEFAULT 'PAID',
  remarks TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(member_id, year_bs, month_bs)
);

-- 7. Loans
CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  loan_no TEXT UNIQUE NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  principal_amount REAL NOT NULL,
  interest_rate REAL NOT NULL,
  interest_method TEXT DEFAULT 'REDUCING_BALANCE',
  duration_months INTEGER NOT NULL,
  disbursement_date TEXT NOT NULL,
  maturity_date TEXT,
  monthly_installment REAL DEFAULT 0.0,
  purpose TEXT,
  guarantor_member_id TEXT,
  guarantor_name TEXT,
  collateral_details TEXT,
  status TEXT DEFAULT 'ACTIVE', -- PENDING, ACTIVE, CLOSED, DEFAULTED
  approved_by TEXT,
  approved_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 8. Loan Repayments
CREATE TABLE IF NOT EXISTS loan_repayments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  receipt_no TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  total_amount REAL NOT NULL,
  principal_amount REAL NOT NULL,
  interest_amount REAL NOT NULL,
  penalty_amount REAL DEFAULT 0.0,
  remaining_principal REAL NOT NULL,
  payment_method TEXT DEFAULT 'CASH',
  remarks TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);

-- 9. Profit & Dividend Distributions
CREATE TABLE IF NOT EXISTS profit_distributions (
  id TEXT PRIMARY KEY,
  fiscal_year_bs TEXT NOT NULL,
  total_profit_pool REAL NOT NULL,
  member_count INTEGER NOT NULL,
  share_per_member REAL NOT NULL,
  distribution_date TEXT NOT NULL,
  status TEXT DEFAULT 'DISTRIBUTED',
  created_by TEXT,
  created_at TEXT NOT NULL
);

-- 10. Cash & Bank Accounts
CREATE TABLE IF NOT EXISTS cash_bank_accounts (
  id TEXT PRIMARY KEY,
  account_name TEXT NOT NULL,
  type TEXT NOT NULL, -- CASH, BANK
  bank_name TEXT,
  account_number TEXT,
  opening_balance REAL DEFAULT 0.0,
  current_balance REAL DEFAULT 0.0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 11. Cash & Bank Transactions
CREATE TABLE IF NOT EXISTS cash_bank_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES cash_bank_accounts(id) ON DELETE RESTRICT,
  type TEXT NOT NULL, -- DEBIT, CREDIT
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  reference_no TEXT,
  description TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);

-- 12. General Ledger
CREATE TABLE IF NOT EXISTS general_ledger (
  id TEXT PRIMARY KEY,
  entry_date TEXT NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit REAL DEFAULT 0.0,
  credit REAL DEFAULT 0.0,
  balance_after REAL DEFAULT 0.0,
  reference_type TEXT,
  reference_id TEXT,
  receipt_no TEXT,
  description TEXT,
  created_at TEXT NOT NULL
);

-- 13. Investments
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_invested REAL NOT NULL,
  current_valuation REAL NOT NULL,
  start_date TEXT NOT NULL,
  expected_return_rate REAL,
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 14. Assets & Liabilities
CREATE TABLE IF NOT EXISTS assets_liabilities (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL, -- CURRENT_ASSET, FIXED_ASSET, CURRENT_LIABILITY, LONG_TERM_LIABILITY, EQUITY
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  as_of_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 15. Server-Side Authentication Sessions
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL, -- ADMIN, MEMBER
  member_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- 16. In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_role TEXT NOT NULL, -- ALL, ADMIN, MEMBER
  recipient_member_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO',
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 17. Governance & Security Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  description TEXT NOT NULL,
  ip_address TEXT
);

-- 18. Official Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  certificate_no TEXT UNIQUE NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  serial_number TEXT UNIQUE NOT NULL,
  verification_hash TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);

-- 19. Member & Group Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  member_id TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by TEXT,
  uploaded_at TEXT NOT NULL
);

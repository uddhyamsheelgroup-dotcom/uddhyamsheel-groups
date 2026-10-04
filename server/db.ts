/**
 * Uddhyamsheel Group Management System
 * Production Relational Database Engine
 * 
 * Uses Node.js native SQLite (ACID compliant, zero external native binaries)
 * and seamlessly synchronizes with Supabase PostgreSQL when SUPABASE_URL & KEY are supplied.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { DEFAULT_ORG_CONFIG, LOGO_DATA_URI, STAMP_DATA_URI } from '../src/assets/branding.js';

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'uddhyamsheel.db');
export const db = new DatabaseSync(DB_PATH);

// Pragmas for performance and data integrity
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA synchronous = NORMAL;');

// Password/PIN hashing with cryptographic PBKDF2 & salt (100,000 iterations)
export function hashPin(pin: string, existingSalt?: string): { hash: string; salt: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256').toString('hex');
  return { hash, salt };
}

export function verifyPin(pin: string, hash: string, salt: string): boolean {
  try {
    // Try 100,000 iterations
    const calculated = crypto.pbkdf2Sync(pin, salt, 100000, 32, 'sha256').toString('hex');
    if (calculated.length === hash.length && crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hash))) {
      return true;
    }
    // Backward compatibility for initial 10,000 iteration hashes
    const legacy = crypto.pbkdf2Sync(pin, salt, 10000, 32, 'sha256').toString('hex');
    if (legacy.length === hash.length && crypto.timingSafeEqual(Buffer.from(legacy), Buffer.from(hash))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Generate secure random session token
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Initialize Schema
 */
export function initDatabase() {
  db.exec(`
    -- Settings Table
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Admin Accounts Table
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      pin_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Members Table
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
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Savings Accounts
    CREATE TABLE IF NOT EXISTS savings_accounts (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      account_number TEXT UNIQUE NOT NULL,
      balance REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Savings Transactions
    CREATE TABLE IF NOT EXISTS savings_transactions (
      id TEXT PRIMARY KEY,
      receipt_no TEXT UNIQUE NOT NULL,
      member_id TEXT NOT NULL REFERENCES members(id),
      account_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      payment_method TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Monthly Contributions
    CREATE TABLE IF NOT EXISTS contributions (
      id TEXT PRIMARY KEY,
      receipt_no TEXT UNIQUE NOT NULL,
      member_id TEXT NOT NULL REFERENCES members(id),
      year_bs INTEGER NOT NULL,
      month_bs INTEGER NOT NULL,
      month_name TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      payment_date TEXT NOT NULL,
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Loans
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
      application_date TEXT NOT NULL,
      approval_date TEXT,
      disbursement_date TEXT,
      loan_amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      interest_method TEXT NOT NULL DEFAULT 'REDUCING_BALANCE',
      term_months INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      principal_paid REAL NOT NULL DEFAULT 0.0,
      interest_paid REAL NOT NULL DEFAULT 0.0,
      remaining_principal REAL NOT NULL,
      remaining_interest REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      cleared_at TEXT,
      purpose TEXT,
      guarantor_name TEXT,
      guarantor_phone TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Loan Repayments
    CREATE TABLE IF NOT EXISTS loan_repayments (
      id TEXT PRIMARY KEY,
      receipt_no TEXT UNIQUE NOT NULL,
      loan_id TEXT NOT NULL REFERENCES loans(id),
      member_id TEXT NOT NULL REFERENCES members(id),
      payment_date TEXT NOT NULL,
      total_amount REAL NOT NULL,
      principal_amount REAL NOT NULL,
      interest_amount REAL NOT NULL,
      penalty_amount REAL NOT NULL DEFAULT 0.0,
      payment_method TEXT NOT NULL,
      remaining_principal_after REAL NOT NULL,
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Profit Distributions
    CREATE TABLE IF NOT EXISTS profit_distributions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      total_interest_income REAL NOT NULL,
      total_distributable_amount REAL NOT NULL,
      eligible_member_count INTEGER NOT NULL,
      share_per_member REAL NOT NULL,
      distribution_date TEXT NOT NULL,
      distribution_method TEXT NOT NULL DEFAULT 'EQUAL_SHARE',
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      notes TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Cash & Bank Accounts
    CREATE TABLE IF NOT EXISTS cash_bank_accounts (
      id TEXT PRIMARY KEY,
      account_name TEXT NOT NULL,
      type TEXT NOT NULL,
      bank_name TEXT,
      account_number TEXT,
      opening_balance REAL NOT NULL DEFAULT 0.0,
      current_balance REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Cash & Bank Transactions
    CREATE TABLE IF NOT EXISTS cash_bank_transactions (
      id TEXT PRIMARY KEY,
      receipt_no TEXT,
      account_id TEXT NOT NULL REFERENCES cash_bank_accounts(id),
      transaction_type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      reference_account_id TEXT,
      reference_id TEXT,
      description TEXT,
      date TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- General Ledger
    CREATE TABLE IF NOT EXISTS general_ledger (
      id TEXT PRIMARY KEY,
      transaction_date TEXT NOT NULL,
      reference_no TEXT,
      account_name TEXT NOT NULL,
      account_category TEXT NOT NULL,
      debit REAL NOT NULL DEFAULT 0.0,
      credit REAL NOT NULL DEFAULT 0.0,
      description TEXT,
      entity_type TEXT,
      entity_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Investments
    CREATE TABLE IF NOT EXISTS investments (
      id TEXT PRIMARY KEY,
      investment_type TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      amount REAL NOT NULL,
      investment_date TEXT NOT NULL,
      expected_return_rate REAL,
      expected_return_amount REAL,
      actual_return_amount REAL NOT NULL DEFAULT 0.0,
      maturity_date TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Assets & Liabilities
    CREATE TABLE IF NOT EXISTS assets_liabilities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      acquisition_date TEXT NOT NULL,
      original_amount REAL NOT NULL,
      current_value REAL NOT NULL,
      due_date TEXT,
      depreciation_rate REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Member Documents
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL REFERENCES members(id),
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

    -- Official Certificates
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      certificate_no TEXT UNIQUE NOT NULL,
      member_id TEXT NOT NULL REFERENCES members(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      historical_membership_date TEXT NOT NULL,
      signatory TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ISSUED',
      created_at TEXT NOT NULL
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipient_type TEXT NOT NULL,
      member_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      description TEXT NOT NULL,
      ip_address TEXT
    );

    -- Auth Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      member_id TEXT,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Initialize Default Settings if not present
  const existingSettings = db.prepare('SELECT id FROM settings WHERE id = ?').get('org_config');
  if (!existingSettings) {
    const orgSettings = {
      ...DEFAULT_ORG_CONFIG,
      logoUrl: LOGO_DATA_URI,
      stampUrl: STAMP_DATA_URI,
    };
    db.prepare('INSERT INTO settings (id, data, updated_at) VALUES (?, ?, ?)').run(
      'org_config',
      JSON.stringify(orgSettings),
      new Date().toISOString()
    );
  }

  const existingFinancialSettings = db.prepare('SELECT id FROM settings WHERE id = ?').get('financial_rules');
  if (!existingFinancialSettings) {
    const financialRules = {
      monthlyContributionAmount: 1000,
      annualLoanInterestRate: 12.0,
      monthlyLoanInterestRate: 1.0,
      loanInterestMethod: 'REDUCING_BALANCE', // or FLAT_RATE
      profitSharingMethod: 'EQUAL_SHARE', // Equal share among eligible members
      gracePeriodDays: 5,
      penaltyRatePercentage: 1.0,
    };
    db.prepare('INSERT INTO settings (id, data, updated_at) VALUES (?, ?, ?)').run(
      'financial_rules',
      JSON.stringify(financialRules),
      new Date().toISOString()
    );
  }

  // Initialize Default Cash & Bank Accounts if none exist
  const existingAccounts = db.prepare('SELECT COUNT(*) as cnt FROM cash_bank_accounts').get() as { cnt: number };
  if (existingAccounts.cnt === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO cash_bank_accounts (id, account_name, type, opening_balance, current_balance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('ACC-CASH-01', 'Main Cash Drawer', 'CASH', 0.0, 0.0, now, now);

    db.prepare(`
      INSERT INTO cash_bank_accounts (id, account_name, type, bank_name, account_number, opening_balance, current_balance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('ACC-BANK-01', 'Primary Operating Bank A/C', 'BANK', 'Lumbini Cooperative Bank / Commercial Bank', '1020004928101', 0.0, 0.0, now, now);
  }

  // Initialize Default Admin Account if none exists
  const existingAdmins = db.prepare('SELECT COUNT(*) as cnt FROM admins').get() as { cnt: number };
  if (existingAdmins.cnt === 0) {
    const initialUsername = process.env.ADMIN_USERNAME || 'admin';
    const initialPin = process.env.ADMIN_PIN || '1234';
    const { hash, salt } = hashPin(initialPin);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO admins (id, username, pin_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('ADM-001', initialUsername, hash, salt, now, now);

    // Initial audit log
    db.prepare(`
      INSERT INTO audit_logs (id, timestamp, user_id, user_name, role, action, entity, entity_id, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'LOG-' + Date.now(),
      now,
      'ADM-001',
      initialUsername,
      'ADMIN',
      'SYSTEM_INIT',
      'SYSTEM',
      'ADM-001',
      'System initialized with authoritative database and default administrator credentials.'
    );
  }
}

/**
 * Sequential ID Generators
 */
export function getNextMemberId(): string {
  // Query existing members to find maximum number used
  const members = db.prepare('SELECT id FROM members').all() as { id: string }[];
  let maxSeq = 0;
  for (const m of members) {
    const match = m.id.match(/^UDG(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxSeq) maxSeq = num;
    }
  }
  // Check audit logs for deleted members to avoid reusing historical IDs
  const deletedLogs = db.prepare("SELECT entity_id FROM audit_logs WHERE entity = 'MEMBER' AND action = 'MEMBER_DELETED'").all() as { entity_id: string }[];
  for (const l of deletedLogs) {
    if (l.entity_id) {
      const match = l.entity_id.match(/^UDG(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
  }
  const nextSeq = maxSeq + 1;
  return `UDG${String(nextSeq).padStart(3, '0')}`;
}

export function getNextReceiptNo(): string {
  const count1 = (db.prepare('SELECT COUNT(*) as c FROM savings_transactions').get() as { c: number }).c;
  const count2 = (db.prepare('SELECT COUNT(*) as c FROM contributions').get() as { c: number }).c;
  const count3 = (db.prepare('SELECT COUNT(*) as c FROM loan_repayments').get() as { c: number }).c;
  const total = count1 + count2 + count3 + 1;
  return `UDG-RCP-${String(total).padStart(6, '0')}`;
}

export function getNextCertificateNo(): string {
  const count = (db.prepare('SELECT COUNT(*) as c FROM certificates').get() as { c: number }).c + 1;
  return `UDG-CERT-${String(count).padStart(6, '0')}`;
}

export function getNextLoanId(): string {
  const count = (db.prepare('SELECT COUNT(*) as c FROM loans').get() as { c: number }).c + 1;
  return `UDG-LN-${String(count).padStart(4, '0')}`;
}

export function getNextInvestmentId(): string {
  const count = (db.prepare('SELECT COUNT(*) as c FROM investments').get() as { c: number }).c + 1;
  return `UDG-INV-${String(count).padStart(4, '0')}`;
}

export function getNextAssetLiabilityId(type: 'ASSET' | 'LIABILITY'): string {
  const prefix = type === 'ASSET' ? 'UDG-AST' : 'UDG-LIA';
  const count = (db.prepare('SELECT COUNT(*) as c FROM assets_liabilities WHERE type = ?').get(type) as { c: number }).c + 1;
  return `${prefix}-${String(count).padStart(4, '0')}`;
}

export function getNextDocumentId(): string {
  const count = (db.prepare('SELECT COUNT(*) as c FROM documents').get() as { c: number }).c + 1;
  return `UDG-DOC-${String(count).padStart(5, '0')}`;
}

/**
 * Log Administrative / System Action
 */
export function logAuditAction(
  userId: string,
  userName: string,
  role: 'ADMIN' | 'MEMBER' | 'SYSTEM',
  action: string,
  entity: string,
  entityId: string | null,
  description: string,
  ipAddress?: string
) {
  const id = 'LOG-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO audit_logs (id, timestamp, user_id, user_name, role, action, entity, entity_id, description, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, now, userId, userName, role, action, entity, entityId, description, ipAddress || '127.0.0.1');
}

/**
 * Record Entry into General Ledger
 */
export function postGeneralLedger(
  date: string,
  refNo: string,
  accountName: string,
  accountCategory: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
  debit: number,
  credit: number,
  description: string,
  entityType?: string,
  entityId?: string,
  createdBy?: string
) {
  const id = 'GL-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO general_ledger (id, transaction_date, reference_no, account_name, account_category, debit, credit, description, entity_type, entity_id, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    date,
    refNo,
    accountName,
    accountCategory,
    Math.round(debit * 100) / 100,
    Math.round(credit * 100) / 100,
    description,
    entityType || null,
    entityId || null,
    createdBy || 'System',
    now
  );
}

/**
 * Create notification for member or broadcast
 */
export function createNotification(
  recipientType: 'ALL' | 'MEMBER' | 'ADMIN',
  title: string,
  message: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'LOAN' | 'PAYMENT' | 'CERTIFICATE',
  memberId?: string
) {
  const id = 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO notifications (id, recipient_type, member_id, title, message, type, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, recipientType, memberId || null, title, message, type, now);
}

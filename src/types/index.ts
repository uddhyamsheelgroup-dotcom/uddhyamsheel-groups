export type UserRole = 'ADMIN' | 'MEMBER';

export interface UserSession {
  userId: string;
  username: string;
  role: UserRole;
  memberId?: string;
  fullName: string;
  membershipDate?: string;
  email?: string;
}

export interface Member {
  id: string; // e.g. UDG001
  full_name: string;
  photo_url?: string | null;
  dob?: string | null;
  gender: string;
  citizenship_no?: string | null;
  address: string;
  mobile_phone: string;
  email?: string | null;
  emergency_name?: string | null;
  emergency_phone?: string | null;
  membership_type: string;
  membership_date: string; // Original historical joining date
  account_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  membership_status: 'ACTIVE' | 'ARCHIVED';
  notes?: string | null;
  created_at: string;
  updated_at: string;
  savings_balance?: number;
  active_loans_count?: number;
}

export interface SavingsAccount {
  id: string;
  member_id: string;
  account_number: string;
  balance: number;
  created_at: string;
  updated_at: string;
  member_name?: string;
  mobile_phone?: string;
}

export interface SavingsTransaction {
  id: string;
  receipt_no: string;
  member_id: string;
  account_id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT' | 'INTEREST_CREDIT';
  amount: number;
  balance_after: number;
  payment_method: string;
  description: string;
  created_by: string;
  date: string;
  created_at: string;
  member_name?: string;
}

export interface Contribution {
  id: string;
  receipt_no: string;
  member_id: string;
  year_bs: number;
  month_bs: number;
  month_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string | null;
  created_by: string;
  created_at: string;
  member_name?: string;
}

export interface Loan {
  id: string; // e.g. UDG-LN-0001
  member_id: string;
  application_date: string;
  approval_date?: string | null;
  disbursement_date?: string | null;
  loan_amount: number;
  interest_rate: number; // e.g. 12.0
  interest_method: 'REDUCING_BALANCE' | 'FLAT_RATE';
  term_months: number;
  start_date: string;
  due_date: string;
  principal_paid: number;
  interest_paid: number;
  remaining_principal: number;
  remaining_interest: number;
  status: 'PENDING' | 'APPROVED' | 'DISBURSED' | 'ACTIVE' | 'CLEARED' | 'REJECTED';
  cleared_at?: string | null;
  purpose?: string | null;
  guarantor_name?: string | null;
  guarantor_phone?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  member_name?: string;
  mobile_phone?: string;
  member_address?: string;
}

export interface LoanRepayment {
  id: string;
  receipt_no: string;
  loan_id: string;
  member_id: string;
  payment_date: string;
  total_amount: number;
  principal_amount: number;
  interest_amount: number;
  penalty_amount: number;
  payment_method: string;
  remaining_principal_after: number;
  notes?: string | null;
  created_by: string;
  created_at: string;
}

export interface CashBankAccount {
  id: string;
  account_name: string;
  type: 'CASH' | 'BANK';
  bank_name?: string | null;
  account_number?: string | null;
  opening_balance: number;
  current_balance: number;
}

export interface CashBankTransaction {
  id: string;
  receipt_no?: string | null;
  account_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  reference_account_id?: string | null;
  description: string;
  date: string;
  created_by: string;
  created_at: string;
  account_name?: string;
  account_type?: 'CASH' | 'BANK';
}

export interface LedgerEntry {
  id: string;
  transaction_date: string;
  reference_no: string;
  account_name: string;
  account_category: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  debit: number;
  credit: number;
  description: string;
  created_by: string;
  created_at: string;
}

export interface Investment {
  id: string;
  investment_type: string;
  institution_name: string;
  amount: number;
  investment_date: string;
  expected_return_rate?: number | null;
  expected_return_amount?: number | null;
  actual_return_amount: number;
  maturity_date?: string | null;
  status: 'ACTIVE' | 'MATURED' | 'LIQUIDATED';
  notes?: string | null;
}

export interface AssetLiability {
  id: string;
  type: 'ASSET' | 'LIABILITY';
  title: string;
  category: string;
  acquisition_date: string;
  original_amount: number;
  current_value: number;
  due_date?: string | null;
  depreciation_rate?: number | null;
  notes?: string | null;
}

export interface MemberDocument {
  id: string;
  member_id: string;
  document_type: string;
  title: string;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  upload_date: string;
  uploaded_by: string;
  notes?: string | null;
  member_name?: string;
}

export interface Certificate {
  id: string;
  certificate_no: string;
  member_id: string;
  type: string;
  title: string;
  issue_date: string;
  historical_membership_date: string;
  signatory: string;
  status: string;
  created_at: string;
  member_name?: string;
  member_address?: string;
  citizenship_no?: string;
}

export interface NotificationItem {
  id: string;
  recipient_type: string;
  member_id?: string | null;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'LOAN' | 'PAYMENT' | 'CERTIFICATE';
  is_read: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  role: string;
  action: string;
  entity: string;
  entity_id?: string | null;
  description: string;
  ip_address?: string | null;
}

export interface OrgConfig {
  name: string;
  nepaliName: string;
  tagline: string;
  establishedBS: string;
  establishedAD: string;
  phone: string;
  email: string;
  address: string;
  signatoryTitle: string;
  currencySymbol: string;
  currencyCode: string;
  logoUrl?: string;
  stampUrl?: string;
}

export interface FinancialRules {
  monthlyContributionAmount: number;
  annualLoanInterestRate: number;
  monthlyLoanInterestRate: number;
  loanInterestMethod: 'REDUCING_BALANCE' | 'FLAT_RATE';
  profitSharingMethod: 'EQUAL_SHARE';
  gracePeriodDays: number;
  penaltyRatePercentage: number;
}

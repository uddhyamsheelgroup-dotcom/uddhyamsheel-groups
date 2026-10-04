import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client.js';
import { UserSession, Member, Certificate, OrgConfig, Loan } from '../../types/index.js';
import { formatNPR } from '../../utils/pdf.js';
import { LOGO_DATA_URI } from '../../assets/branding.js';
import {
  LayoutDashboard,
  User,
  PiggyBank,
  Coins,
  HandCoins,
  FileSpreadsheet,
  Award,
  FolderOpen,
  Bell,
  Lock,
  Printer,
  Receipt,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  Percent,
  TrendingUp,
  CreditCard,
  FileText,
  Menu,
  Calendar,
  X
} from 'lucide-react';
import { validateNumericPin, validatePinMatch } from '../../utils/pinValidation.js';

interface MemberPortalProps {
  user: UserSession;
  org: OrgConfig;
  onViewReceipt: (receipt: any) => void;
  onViewCertificate: (cert: Certificate, member: Member) => void;
  activeNavTab: string;
  onNavTabChange: (tab: string) => void;
  onOpenBrandKit?: () => void;
}

export const MemberPortal: React.FC<MemberPortalProps> = ({
  user,
  org,
  onViewReceipt,
  onViewCertificate,
  activeNavTab,
  onNavTabChange,
  onOpenBrandKit
}) => {
  const [memberData, setMemberData] = useState<any>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [interestHistory, setInterestHistory] = useState<any>(null);
  const [interestFilter, setInterestFilter] = useState<'all' | 'year' | 'month'>('all');
  const [selectedLoanFilter, setSelectedLoanFilter] = useState<string>('ALL');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Change PIN state
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  const fetchMemberInfo = async () => {
    if (!user.memberId) return;
    setLoading(true);
    try {
      const [mRes, sRes, nRes, fRes, iRes] = await Promise.all([
        api.getMember(user.memberId),
        api.getMemberStatement(user.memberId).catch(() => null),
        api.getNotifications().catch(() => ({ notifications: [] })),
        api.getMemberFinancialSummary().catch(() => null),
        api.getMemberInterestHistory({
          filter: interestFilter,
          loanId: selectedLoanFilter !== 'ALL' ? selectedLoanFilter : undefined
        }).catch(() => null)
      ]);
      setMemberData(mRes);
      setStatementData(sRes);
      setNotifications(nRes?.notifications || []);
      setFinancialSummary(fRes);
      setInterestHistory(iRes);
    } catch (err: any) {
      console.error('Fetch member portal data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberInfo();
  }, [user.memberId, interestFilter, selectedLoanFilter]);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);
    if (!pinForm.currentPin) {
      setPinError('Please enter your current PIN.');
      return;
    }

    const val = validateNumericPin(pinForm.newPin, 6, 'New PIN', true);
    if (!val.isValid) {
      setPinError(val.error || 'New PIN must be exactly 6 digits.');
      return;
    }

    const match = validatePinMatch(pinForm.newPin, pinForm.confirmPin, 'New PIN');
    if (!match.isValid) {
      setPinError(match.error || 'New PIN and Confirmation PIN do not match.');
      return;
    }

    try {
      await api.changeMemberPin(pinForm.currentPin, pinForm.newPin);
      setPinSuccess('Your security PIN has been updated successfully!');
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
    } catch (err: any) {
      setPinError(err.message || 'Failed to update PIN.');
    }
  };

  const member: Member = memberData?.member || {};
  const savingsAccount = memberData?.savingsAccount || { balance: 0.0, account_number: 'N/A' };
  const totalContributions = memberData?.totalContributions || 0.0;
  const loanSummary = memberData?.loanSummary || {};
  const activeLoans: Loan[] = memberData?.activeLoans || [];
  const certificates: Certificate[] = memberData?.certificates || [];
  const documents = memberData?.documents || [];

  // Determine next expected payment or earliest active loan due date
  const nextPaymentInfo = useMemo(() => {
    if (activeLoans && activeLoans.length > 0) {
      const sorted = [...activeLoans].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      const earliest = sorted[0];
      return {
        hasLoan: true,
        dueDate: earliest.due_date,
        remainingPrincipal: earliest.remaining_principal,
        id: earliest.id
      };
    }
    return {
      hasLoan: false,
      dueDate: null,
      remainingPrincipal: 0,
      id: null
    };
  }, [activeLoans]);

  // Aggregate unified real database transactions for the member
  const allRecentTransactions = useMemo(() => {
    const list: any[] = [];
    if (statementData?.savingsTx) {
      statementData.savingsTx.forEach((tx: any) => {
        list.push({
          id: tx.id || `sav-${tx.receipt_no}`,
          receipt_no: tx.receipt_no,
          date: tx.date,
          type: `Savings ${tx.type}`,
          category: `SAVINGS ${tx.type}`,
          amount: tx.amount,
          paymentMethod: tx.payment_method || 'CASH',
          description: tx.description || 'Savings transaction',
          balanceAfter: tx.balance_after
        });
      });
    }
    if (statementData?.contributions) {
      statementData.contributions.forEach((c: any) => {
        list.push({
          id: c.id || `con-${c.receipt_no}`,
          receipt_no: c.receipt_no,
          date: c.payment_date,
          type: `Monthly Contribution`,
          category: `MONTHLY CONTRIBUTION`,
          amount: c.amount,
          paymentMethod: c.payment_method || 'CASH',
          description: `Contribution for ${c.month_name} ${c.year_bs} B.S.`
        });
      });
    }
    if (statementData?.repayments) {
      statementData.repayments.forEach((r: any) => {
        list.push({
          id: r.id || `rep-${r.receipt_no}`,
          receipt_no: r.receipt_no,
          date: r.payment_date,
          type: 'Loan Repayment',
          category: 'LOAN REPAYMENT',
          amount: r.total_amount,
          paymentMethod: r.payment_method || 'CASH',
          description: `Repayment for Loan ${r.loan_id}`
        });
      });
    }
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [statementData]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Loading Member Portal...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* ========================================================================= */}
      {/* 1. MEMBER MOBILE HEADER & GREETING (block md:hidden) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 font-mono">
              Member Portal · {org.name || 'Uddhyamsheel'}
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              ID: {member.id}
            </span>
          </div>

          <h1 className="text-xl font-bold font-serif text-slate-900">
            Welcome, {member.full_name}
          </h1>

          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {member.account_status || 'ACTIVE'}
            </span>
            <span>·</span>
            <span>Joined: <strong className="font-mono text-slate-700">{member.membership_date}</strong></span>
            <span>·</span>
            <span className="text-slate-600">{member.membership_type || 'General Member'}</span>
          </div>
        </div>

        {/* Mobile Compact 2x2 Financial Cards */}
        {activeNavTab === 'dashboard' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Financial Overview
                </h2>
                <span className="text-[10px] text-slate-400 font-medium">Real-time balances</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Savings Balance */}
                <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Savings</span>
                    <PiggyBank className="w-4 h-4 text-cyan-700 shrink-0" />
                  </div>
                  <div>
                    <div className="text-base font-bold font-mono text-slate-950 truncate">
                      {formatNPR(savingsAccount.balance)}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      A/C: {savingsAccount.account_number}
                    </div>
                  </div>
                </div>

                {/* 2. Outstanding Loan */}
                <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Loan Principal</span>
                    <HandCoins className="w-4 h-4 text-rose-700 shrink-0" />
                  </div>
                  <div>
                    <div className="text-base font-bold font-mono text-rose-700 truncate">
                      {formatNPR(loanSummary.total_outstanding || 0)}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {activeLoans.length > 0 ? `${activeLoans.length} active loan` : 'Zero active debt'}
                    </div>
                  </div>
                </div>

                {/* 3. Contributions */}
                <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Contributions</span>
                    <Coins className="w-4 h-4 text-amber-700 shrink-0" />
                  </div>
                  <div>
                    <div className="text-base font-bold font-mono text-amber-800 truncate">
                      {formatNPR(totalContributions)}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      Cumulative Share
                    </div>
                  </div>
                </div>

                {/* 4. Next Payment */}
                <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Next Payment</span>
                    <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-mono text-slate-900 truncate">
                      {nextPaymentInfo.hasLoan ? `Due: ${nextPaymentInfo.dueDate}` : 'No dues pending'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {nextPaymentInfo.hasLoan ? `Bal: ${formatNPR(nextPaymentInfo.remainingPrincipal)}` : 'Cleared'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prominent Interest Paid Banner Card (Tap to View History) */}
              <div
                onClick={() => onNavTabChange('interest-paid')}
                className="mt-2.5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 rounded-xl p-3.5 text-slate-950 shadow-md cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5" />
                    <span>TOTAL INTEREST PAID</span>
                  </span>
                  <span className="text-[10px] font-extrabold bg-slate-950/15 px-2 py-0.5 rounded-full flex items-center gap-0.5 text-slate-950">
                    <span>View History</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="text-xl font-black font-mono mt-1 text-slate-950">
                  {formatNPR(financialSummary?.totalInterestPaid || interestHistory?.totalInterestPaidToDate || 0)}
                </div>
                <p className="text-[10px] font-bold text-slate-950/80 mt-0.5">
                  Total loan interest paid to date · This Year: {formatNPR(interestHistory?.thisYearInterest || 0)}
                </p>
              </div>
            </div>

            {/* Mobile Quick Actions */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-2">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => onNavTabChange('statements')}
                  className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-left shadow-2xs flex items-center gap-2.5 transition-colors min-h-[48px] cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">View Statement</div>
                    <div className="text-[10px] text-slate-500 truncate">Ledger record</div>
                  </div>
                </button>

                <button
                  onClick={() => onNavTabChange('savings')}
                  className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-left shadow-2xs flex items-center gap-2.5 transition-colors min-h-[48px] cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                    <PiggyBank className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">Transactions</div>
                    <div className="text-[10px] text-slate-500 truncate">Deposit history</div>
                  </div>
                </button>

                <button
                  onClick={() => onNavTabChange('loans')}
                  className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-left shadow-2xs flex items-center gap-2.5 transition-colors min-h-[48px] cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                    <HandCoins className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">View Loan</div>
                    <div className="text-[10px] text-slate-500 truncate">EMI schedule</div>
                  </div>
                </button>

                {certificates.length > 0 ? (
                  <button
                    onClick={() => onViewCertificate(certificates[0], member)}
                    className="p-3 bg-white hover:bg-slate-50 border border-amber-300 rounded-xl text-left shadow-2xs flex items-center gap-2.5 transition-colors min-h-[48px] cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">Certificate</div>
                      <div className="text-[10px] text-amber-700 truncate">Charter № {certificates[0].certificate_no}</div>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavTabChange('statements')}
                    className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-left shadow-2xs flex items-center gap-2.5 transition-colors min-h-[48px] cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">Receipts</div>
                      <div className="text-[10px] text-slate-500 truncate">Payment proofs</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Recent Transactions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Recent Transactions
                </h2>
                <button
                  onClick={() => onNavTabChange('statements')}
                  className="text-xs text-blue-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>Full Ledger</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {allRecentTransactions.length > 0 ? (
                  allRecentTransactions.slice(0, 6).map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">
                          {tx.type}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                          <span>{tx.date}</span>
                          <span>·</span>
                          <span className="font-mono text-slate-400">{tx.receipt_no}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {formatNPR(tx.amount)}
                        </div>
                        <button
                          onClick={() =>
                            onViewReceipt({
                              receiptNo: tx.receipt_no,
                              date: tx.date,
                              memberId: member.id,
                              memberName: member.full_name,
                              category: tx.category,
                              amount: tx.amount,
                              paymentMethod: tx.paymentMethod,
                              description: tx.description,
                              balanceAfter: tx.balanceAfter
                            })
                          }
                          className="text-[11px] text-blue-700 font-semibold hover:underline inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                        >
                          <Receipt className="w-3 h-3 text-blue-700" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No transactions yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Your savings deposits, monthly contributions, and loan payments will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. MEMBER DESKTOP HERO & TOP CARDS (hidden md:block) */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-6">
        {/* Desktop Welcome Banner */}
        <div className="bg-gradient-to-r from-[#011833] via-[#023e8a] to-[#0077b6] rounded-2xl p-6 text-white shadow-xl border border-sky-400/30 relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-md ring-2 ring-cyan-300/60 shrink-0 flex items-center justify-center">
                <img src={LOGO_DATA_URI} alt="UG Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-cyan-300 text-xs font-bold uppercase tracking-wider">
                    {org.name || 'Uddhyamsheel Group'} Member Portal
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-xs text-white font-mono font-bold bg-sky-950/80 px-2.5 py-0.5 rounded-full border border-cyan-400/40 shadow-xs">
                    ID: {member.id}
                  </span>
                  <span className="text-xs text-emerald-300 font-semibold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                    {member.account_status || 'ACTIVE'}
                  </span>
                </div>
                <h1 className="text-2xl font-black font-serif text-white tracking-wide">
                  Welcome, {member.full_name}
                </h1>
                <p className="text-xs text-cyan-100/90 mt-1">
                  Membership Date: <span className="font-mono text-white font-bold">{member.membership_date}</span> · {member.membership_type} · Resident of {member.address}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {onOpenBrandKit && (
                <button
                  onClick={onOpenBrandKit}
                  className="px-3.5 py-2.5 bg-sky-950/80 hover:bg-sky-900 text-cyan-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-cyan-400/40 shadow-md transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Official Seal & Charter</span>
                </button>
              )}

              {certificates.length > 0 && (
                <button
                  onClick={() => onViewCertificate(certificates[0], member)}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>Official Certificate</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Top 5 Financial Cards */}
        {activeNavTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* 1. Savings Balance */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Savings Balance
                </span>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1 truncate">
                  {formatNPR(savingsAccount.balance)}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">A/C: {savingsAccount.account_number}</span>
              </div>

              {/* 2. Total Contributions */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Contributions
                </span>
                <div className="text-xl font-bold font-mono text-amber-800 mt-1 truncate">
                  {formatNPR(totalContributions)}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">Cumulative member share</span>
              </div>

              {/* 3. TOTAL INTEREST PAID (PROMINENT HIGHLIGHT) */}
              <div
                onClick={() => onNavTabChange('interest-paid')}
                className="bg-gradient-to-br from-amber-50 to-amber-100/70 hover:from-amber-100 hover:to-amber-200/70 border border-amber-300 rounded-xl p-4 shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-amber-800" />
                      <span>Interest Paid</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-700 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <div className="text-xl font-black font-mono text-amber-900 mt-1 truncate">
                    {formatNPR(financialSummary?.totalInterestPaid || interestHistory?.totalInterestPaidToDate || 0)}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-800 block mt-1">
                  Lifetime interest · Tap to view
                </span>
              </div>

              {/* 4. Outstanding Loan */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Outstanding Loan
                </span>
                <div className="text-xl font-bold font-mono text-rose-700 mt-1 truncate">
                  {formatNPR(financialSummary?.outstandingPrincipal || loanSummary.total_outstanding || 0)}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {activeLoans.length > 0 ? `${activeLoans.length} active facility` : 'Zero active debt'}
                </span>
              </div>

              {/* 5. Next / Expected Payment */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Next Payment Due
                </span>
                <div className="text-base font-bold font-mono text-blue-900 mt-1 truncate">
                  {nextPaymentInfo.hasLoan ? nextPaymentInfo.dueDate : 'No dues pending'}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 truncate">
                  {nextPaymentInfo.hasLoan ? `Bal: ${formatNPR(nextPaymentInfo.remainingPrincipal)}` : 'Cleared'}
                </span>
              </div>
            </div>

            {/* Active Credit Accounts & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Active Credit Accounts */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
                  <h3 className="text-sm font-bold text-slate-900">My Credit Facilities</h3>
                  <button
                    onClick={() => onNavTabChange('loans')}
                    className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                {activeLoans.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <HandCoins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-600">No active loans outstanding</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">You have zero outstanding debt with the cooperative.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeLoans.map((l) => (
                      <div key={l.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono font-bold text-amber-800">{l.id}</span>
                          <span className="font-semibold text-slate-700">{l.interest_rate}% p.a.</span>
                        </div>
                        <div className="flex justify-between items-baseline mt-2">
                          <span className="text-slate-500">Remaining Principal:</span>
                          <span className="text-base font-bold font-mono text-rose-700">{formatNPR(l.remaining_principal)}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                          <span>Disbursed: {l.disbursement_date || l.application_date}</span>
                          <span>Due Date: {l.due_date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Member Transactions */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Recent Transactions</h3>
                  <button
                    onClick={() => onNavTabChange('statements')}
                    className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer"
                  >
                    Full Statement
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[260px] space-y-2">
                  {allRecentTransactions.length > 0 ? (
                    allRecentTransactions.slice(0, 5).map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-slate-900 truncate">{tx.type}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                            <span>{tx.date}</span>
                            <span>·</span>
                            <span className="font-mono text-slate-400">{tx.receipt_no}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-slate-900">{formatNPR(tx.amount)}</div>
                          <button
                            onClick={() =>
                              onViewReceipt({
                                receiptNo: tx.receipt_no,
                                date: tx.date,
                                memberId: member.id,
                                memberName: member.full_name,
                                category: tx.category,
                                amount: tx.amount,
                                paymentMethod: tx.paymentMethod,
                                description: tx.description,
                                balanceAfter: tx.balanceAfter
                              })
                            }
                            className="text-[10px] text-blue-700 hover:underline flex items-center gap-0.5 justify-end mt-0.5 cursor-pointer"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-8 text-center text-slate-400">
                      <Receipt className="w-8 h-8 text-slate-300 mb-1" />
                      <p className="text-xs font-medium text-slate-600">No transactions recorded yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. DEDICATED MEMBER TABS (SAVINGS, LOANS, STATEMENTS, PROFILE, ETC.) */}
      {/* ========================================================================= */}

      {/* MY PROFILE */}
      {activeNavTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
            <div className="w-12 h-12 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-lg font-serif shrink-0">
              {member.full_name?.charAt(0) || 'M'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{member.full_name}</h2>
              <p className="text-xs text-slate-500">
                Official Identification: <span className="font-mono text-blue-900 font-bold">[{member.id}]</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Original Historical Induction Date</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{member.membership_date}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Registered Mobile Phone</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{member.mobile_phone}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Citizenship Certificate Number</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{member.citizenship_no || 'Recorded on File'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Residential Address</span>
              <span className="font-medium text-slate-900 text-sm">{member.address}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Membership Category</span>
              <span className="font-semibold text-blue-900 text-sm">{member.membership_type}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Account Status</span>
              <span className="font-bold text-emerald-700 text-sm">{member.account_status}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Emergency Contact Name</span>
              <span className="font-medium text-slate-900 text-sm">{member.emergency_name || 'N/A'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">Emergency Contact Phone</span>
              <span className="font-mono font-medium text-slate-900 text-sm">{member.emergency_phone || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* MY SAVINGS */}
      {activeNavTab === 'savings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs text-slate-500 uppercase font-semibold">Total Savings Balance</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-950 mt-1">
                {formatNPR(savingsAccount.balance)}
              </div>
              <span className="text-[11px] text-slate-400">Account: {savingsAccount.account_number}</span>
            </div>
            <span className="text-xs text-cyan-800 bg-cyan-50 px-3 py-1.5 rounded-lg border border-cyan-200 font-semibold self-start sm:self-auto">
              Active Savings Liquidity
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-900 text-white font-semibold text-xs">
              Savings Transaction Ledger
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Receipt No</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Balance After</th>
                    <th className="py-2.5 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {statementData?.savingsTx?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                        No savings transactions found.
                      </td>
                    </tr>
                  ) : (
                    statementData?.savingsTx?.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{t.receipt_no}</td>
                        <td className="py-2 px-3 text-slate-600 font-sans">{t.date}</td>
                        <td className="py-2 px-3 font-semibold text-emerald-700">{t.type}</td>
                        <td className="py-2 px-3 font-bold text-slate-950">{formatNPR(t.amount)}</td>
                        <td className="py-2 px-3 text-slate-600">{formatNPR(t.balance_after)}</td>
                        <td className="py-2 px-3 text-right font-sans">
                          <button
                            onClick={() =>
                              onViewReceipt({
                                receiptNo: t.receipt_no,
                                date: t.date,
                                memberId: member.id,
                                memberName: member.full_name,
                                category: `SAVINGS ${t.type}`,
                                amount: t.amount,
                                paymentMethod: t.payment_method,
                                description: t.description,
                                balanceAfter: t.balance_after
                              })
                            }
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[10px] cursor-pointer"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MY CONTRIBUTIONS */}
      {activeNavTab === 'contributions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <span className="text-xs text-slate-500 uppercase font-semibold">Total Contributions Contributed</span>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-800 mt-1">
              {formatNPR(totalContributions)}
            </div>
            <span className="text-[11px] text-slate-400">Regular cooperative member solidarity deposits</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-900 text-white font-semibold text-xs">
              Contributions Record
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Receipt No</th>
                    <th className="py-2.5 px-3">Payment Date</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {statementData?.contributions?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                        No contributions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    statementData?.contributions?.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{c.receipt_no}</td>
                        <td className="py-2 px-3 text-slate-600 font-sans">{c.payment_date}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-amber-800">{c.month_name} {c.year_bs} B.S.</td>
                        <td className="py-2 px-3 font-bold text-slate-950">{formatNPR(c.amount)}</td>
                        <td className="py-2 px-3 font-sans text-slate-600">{c.payment_method}</td>
                        <td className="py-2 px-3 text-right font-sans">
                          <button
                            onClick={() =>
                              onViewReceipt({
                                receiptNo: c.receipt_no,
                                date: c.payment_date,
                                memberId: member.id,
                                memberName: member.full_name,
                                category: `MONTHLY CONTRIBUTION (${c.month_name} ${c.year_bs})`,
                                amount: c.amount,
                                paymentMethod: c.payment_method,
                                description: `Contribution dues for ${c.month_name} ${c.year_bs} B.S.`
                              })
                            }
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[10px] cursor-pointer"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MY LOANS */}
      {activeNavTab === 'loans' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <span className="text-xs text-slate-500 uppercase font-semibold">Total Credit Outstanding</span>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-700 mt-1">
              {formatNPR(loanSummary.total_outstanding || 0)}
            </div>
            <span className="text-[11px] text-slate-400">Total principal repaid: {formatNPR(loanSummary.total_principal_paid || 0)}</span>
          </div>

          <div className="space-y-3">
            {statementData?.loans?.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-slate-400 border border-slate-200">
                <HandCoins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 text-xs">No loan records on file.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">You have zero outstanding loans.</p>
              </div>
            ) : (
              statementData?.loans?.map((l: any) => (
                <div key={l.id} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <div>
                      <span className="font-mono font-bold text-amber-800 text-sm">{l.id}</span>
                      <span className="text-xs text-slate-500 ml-2">({l.purpose})</span>
                    </div>
                    {l.status === 'CLEARED' ? (
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded border border-emerald-300">
                        CLEARED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-semibold text-xs rounded">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 font-sans block">Sanctioned Amount</span>
                      <span className="font-bold text-slate-900">{formatNPR(l.loan_amount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block">Principal Repaid</span>
                      <span className="font-bold text-emerald-700">{formatNPR(l.principal_paid)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block">Outstanding Principal</span>
                      <span className="font-bold text-rose-700">{formatNPR(l.remaining_principal)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block">Interest Rate</span>
                      <span className="font-bold text-slate-900">{l.interest_rate}% p.a.</span>
                    </div>
                  </div>

                  {/* Visual Repayment Progress Indicator */}
                  {l.loan_amount > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-sans text-slate-500 font-medium">Repayment Progress</span>
                        <span className="font-mono font-bold text-slate-900">
                          {Math.min(100, Math.round(((l.principal_paid || 0) / l.loan_amount) * 100))}% Repaid
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, ((l.principal_paid || 0) / l.loan_amount) * 100))}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                        <span>Paid: {formatNPR(l.principal_paid || 0)}</span>
                        <span>Remaining: {formatNPR(l.remaining_principal || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED INTEREST PAID & FINANCIAL OVERVIEW SECTION */}
      {/* ========================================================================= */}
      {activeNavTab === 'interest-paid' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold font-serif text-slate-900">Loan Interest Paid & Financial Overview</h2>
              <p className="text-xs text-slate-500">Authoritative audit of all loan interest, principal, and penalty charges paid</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchMemberInfo()}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* Top KPI Cards for Interest & Borrowing */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 rounded-2xl p-4 sm:p-5 text-slate-950 shadow-md">
              <span className="text-[11px] font-black uppercase tracking-wider block opacity-90">
                Total Interest Paid
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono mt-1">
                {formatNPR(financialSummary?.totalInterestPaid || interestHistory?.totalInterestPaidToDate || 0)}
              </div>
              <span className="text-[10px] font-semibold opacity-90 block mt-1">Lifetime interest contributions</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Interest Paid (This Year)
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 mt-1">
                {formatNPR(interestHistory?.thisYearInterest || 0)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Fiscal Year 2082/2083 B.S.</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Principal Paid
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700 mt-1">
                {formatNPR(financialSummary?.totalPrincipalPaid || 0)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Principal amortized</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Outstanding Principal
              </span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-700 mt-1">
                {formatNPR(financialSummary?.outstandingPrincipal || 0)}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Remaining debt liability</span>
            </div>
          </div>

          {/* Financial Position Matrix (Detailed Authoritative Totals) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-3">
              Authoritative Financial Position Matrix
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Total Savings</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{formatNPR(financialSummary?.totalSavings || savingsAccount.balance)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Contributions</span>
                <span className="font-mono font-bold text-amber-800 text-sm mt-0.5 block">{formatNPR(financialSummary?.totalContributions || totalContributions)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Total Borrowed</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{formatNPR(financialSummary?.totalLoanPrincipal || 0)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Total Payments</span>
                <span className="font-mono font-bold text-blue-900 text-sm mt-0.5 block">{formatNPR(financialSummary?.totalLoanPayments || 0)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Penalties Paid</span>
                <span className="font-mono font-bold text-rose-700 text-sm mt-0.5 block">{formatNPR(financialSummary?.totalPenaltyPaid || 0)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Net Outstanding</span>
                <span className="font-mono font-bold text-rose-800 text-sm mt-0.5 block">{formatNPR(financialSummary?.totalOutstanding || 0)}</span>
              </div>
            </div>
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Filter Period:</span>
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                <button
                  onClick={() => setInterestFilter('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${interestFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  All Time
                </button>
                <button
                  onClick={() => setInterestFilter('year')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${interestFilter === 'year' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  This Year (2083)
                </button>
                <button
                  onClick={() => setInterestFilter('month')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${interestFilter === 'month' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  This Month
                </button>
              </div>
            </div>

            {activeLoans.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-semibold">By Loan:</span>
                <select
                  value={selectedLoanFilter}
                  onChange={(e) => setSelectedLoanFilter(e.target.value)}
                  className="p-1.5 border border-slate-300 rounded-lg text-xs bg-white font-mono"
                >
                  <option value="ALL">All Active Loans</option>
                  {activeLoans.map((l) => (
                    <option key={l.id} value={l.id}>{l.id} - {formatNPR(l.loan_amount)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Interest Paid Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-serif">Interest Payment Ledger</h3>
              <span className="text-xs text-slate-500 font-mono">
                {interestHistory?.repayments ? `${interestHistory.repayments.length} records found` : '0 records'}
              </span>
            </div>

            {interestHistory?.repayments && interestHistory.repayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-sans font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Receipt №</th>
                      <th className="py-2.5 px-3">Loan ID</th>
                      <th className="py-2.5 px-3">Total Payment</th>
                      <th className="py-2.5 px-3 text-emerald-800">Principal</th>
                      <th className="py-2.5 px-3 text-amber-700 font-bold bg-amber-50/50">Interest Paid</th>
                      <th className="py-2.5 px-3 text-rose-700">Penalty</th>
                      <th className="py-2.5 px-3">Rem. Principal</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {interestHistory.repayments.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-sans text-slate-700">{r.payment_date}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{r.receipt_no}</td>
                        <td className="py-2.5 px-3 text-blue-900 font-semibold">{r.loan_id}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-950">{formatNPR(r.total_amount)}</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-semibold">{formatNPR(r.principal_amount)}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-800 bg-amber-50/50">{formatNPR(r.interest_amount)}</td>
                        <td className="py-2.5 px-3 text-rose-700">{r.penalty_amount > 0 ? formatNPR(r.penalty_amount) : '—'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatNPR(r.remaining_principal)}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-500">{r.payment_method || 'CASH'}</td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <button
                            onClick={() =>
                              onViewReceipt({
                                receiptNo: r.receipt_no,
                                date: r.payment_date,
                                memberId: member.id,
                                memberName: member.full_name,
                                category: 'LOAN REPAYMENT',
                                amount: r.total_amount,
                                paymentMethod: r.payment_method || 'CASH',
                                description: `Loan Repayment (${r.loan_id}): Principal ${formatNPR(r.principal_amount)} + Interest ${formatNPR(r.interest_amount)}`,
                                balanceAfter: r.remaining_principal
                              })
                            }
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[11px] cursor-pointer inline-flex items-center gap-1 border border-amber-200/60"
                          >
                            <Receipt className="w-3 h-3 text-amber-700" />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Percent className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 text-xs">No interest payments recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">When you repay loan installments, the interest breakdown will appear here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MY STATEMENTS */}
      {activeNavTab === 'statements' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-serif">Comprehensive Member Statement</h2>
              <p className="text-xs text-slate-500">Official statement of savings, contributions, and credit facilities</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Statement</span>
            </button>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Member Name</span>
              <span className="font-bold text-slate-900">{member.full_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Induction Date</span>
              <span className="font-mono font-bold text-slate-900">{member.membership_date}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Current Savings</span>
              <span className="font-mono font-bold text-slate-900">{formatNPR(savingsAccount.balance)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Loan Balance</span>
              <span className="font-mono font-bold text-rose-700">{formatNPR(loanSummary.total_outstanding || 0)}</span>
            </div>
          </div>

          {/* Unified Statement Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              All Recorded Transactions
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[500px]">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {allRecentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      allRecentTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{tx.receipt_no}</td>
                          <td className="py-2 px-3 text-slate-600 font-sans">{tx.date}</td>
                          <td className="py-2 px-3 font-sans font-semibold text-slate-800">{tx.type}</td>
                          <td className="py-2 px-3 font-bold text-slate-950">{formatNPR(tx.amount)}</td>
                          <td className="py-2 px-3 font-sans text-slate-600">{tx.paymentMethod}</td>
                          <td className="py-2 px-3 text-right font-sans">
                            <button
                              onClick={() =>
                                onViewReceipt({
                                  receiptNo: tx.receipt_no,
                                  date: tx.date,
                                  memberId: member.id,
                                  memberName: member.full_name,
                                  category: tx.category,
                                  amount: tx.amount,
                                  paymentMethod: tx.paymentMethod,
                                  description: tx.description,
                                  balanceAfter: tx.balanceAfter
                                })
                              }
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[10px] cursor-pointer"
                            >
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MY CERTIFICATES */}
      {activeNavTab === 'certificates' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-serif">Official Membership Certificates</h2>
            <p className="text-xs text-slate-500">Legal chartered recognition with authentic notary stamp & signatures</p>
          </div>

          {certificates.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-xs">No certificates issued yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {certificates.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#FCFAF2] rounded-2xl border-2 border-[#B8860B] p-5 sm:p-6 shadow-md relative overflow-hidden flex flex-col justify-between group hover:border-[#002984] hover:shadow-xl transition-all"
                >
                  <div className="absolute top-2 left-2 right-2 bottom-2 border border-[#B8860B]/30 rounded-xl pointer-events-none" />

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white p-1 border-2 border-[#B8860B] shadow-sm flex items-center justify-center shrink-0">
                          <img src={LOGO_DATA_URI} alt="UG" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#B8860B]">
                            Chartered Document
                          </span>
                          <h3 className="font-serif font-black text-base text-[#002984]">
                            Membership Certificate
                          </h3>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-black text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded shadow-2xs">
                        № {c.certificate_no}
                      </span>
                    </div>

                    <div className="bg-white/80 rounded-xl p-3 border border-slate-200/80 mb-4 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Certified Member:</span>
                        <span className="font-bold text-slate-900">{member.full_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Member ID:</span>
                        <span className="font-mono font-bold text-[#002984]">[{member.id}]</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Induction Date:</span>
                        <span className="font-mono font-bold text-[#B8860B]">{c.historical_membership_date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Date of Issue:</span>
                        <span className="font-semibold text-slate-800">{c.issue_date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-[10.5px] text-slate-500 font-serif italic">
                      Uddhyamsheel Group · Lumbini
                    </div>

                    <button
                      onClick={() => onViewCertificate(c, member)}
                      className="px-4 py-2 bg-gradient-to-r from-[#002984] via-[#005a9e] to-[#002984] hover:from-[#001f66] hover:to-[#004a82] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/20 transition-all cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>View & Download Certificate</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MY DOCUMENTS */}
      {activeNavTab === 'documents' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 font-serif">My Official Files & Identity Documents</h2>
          {documents.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-slate-400 border border-slate-200">
              <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-xs">No documents uploaded to your vault yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[400px]">
                  <thead className="bg-slate-900 text-slate-200 font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Document Title</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Upload Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {documents.map((d: any) => (
                      <tr key={d.id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{d.title}</td>
                        <td className="py-2.5 px-3 text-slate-600">{d.document_type}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{d.upload_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NOTIFICATIONS */}
      {activeNavTab === 'notifications' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 font-serif">Cooperative Notices & Alerts</h2>
          {notifications.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-slate-400 border border-slate-200">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No notices at this time.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-w-2xl">
              {notifications.map((n) => (
                <div key={n.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 text-sm">{n.title}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">{n.created_at.substring(0, 10)}</span>
                  </div>
                  <p className="text-slate-600">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACCOUNT SECURITY & PIN */}
      {activeNavTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs max-w-md space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Lock className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">Change Member Portal PIN</h2>
          </div>

          {pinSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{pinSuccess}</span>
            </div>
          )}

          {pinError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          <form onSubmit={handleChangePin} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Current PIN</label>
              <input
                type="password"
                required
                value={pinForm.currentPin}
                onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                placeholder="••••"
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 font-mono tracking-widest text-center text-sm font-bold min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">New 6-Digit PIN</label>
              <input
                type="password"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinForm.newPin}
                onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                placeholder="••••••"
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 font-mono tracking-widest text-center text-sm font-bold min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Confirm New PIN</label>
              <input
                type="password"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinForm.confirmPin}
                onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                placeholder="••••••"
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 font-mono tracking-widest text-center text-sm font-bold min-h-[44px]"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-[#011833] hover:bg-[#022859] text-white font-bold rounded-xl text-xs transition-colors shadow-sm min-h-[44px] cursor-pointer"
            >
              Update Security PIN
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FIXED MOBILE BOTTOM TAB BAR FOR MEMBERS (PATTERN 1: FIXED TAB BAR) */}
      {/* ========================================================================= */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#011833]/95 backdrop-blur-md border-t border-sky-900/60 pb-safe lg:hidden shadow-2xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' }}
        aria-label="Member Mobile Navigation"
      >
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {/* 1. Home */}
          <button
            onClick={() => onNavTabChange('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
              activeNavTab === 'dashboard' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Home Dashboard"
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span className="text-[10px] mt-1 leading-none">Home</span>
          </button>

          {/* 2. Savings */}
          <button
            onClick={() => onNavTabChange('savings')}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
              activeNavTab === 'savings' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Savings Accounts"
          >
            <PiggyBank className="w-5 h-5 shrink-0" />
            <span className="text-[10px] mt-1 leading-none">Savings</span>
          </button>

          {/* 3. Loans */}
          <button
            onClick={() => onNavTabChange('loans')}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
              activeNavTab === 'loans' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Loans and EMI"
          >
            <HandCoins className="w-5 h-5 shrink-0" />
            <span className="text-[10px] mt-1 leading-none">Loans</span>
          </button>

          {/* 4. Statements */}
          <button
            onClick={() => onNavTabChange('statements')}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
              activeNavTab === 'statements' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="Account Statements"
          >
            <FileSpreadsheet className="w-5 h-5 shrink-0" />
            <span className="text-[10px] mt-1 leading-none">Statement</span>
          </button>

          {/* 5. More */}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
              ['profile', 'interest-paid', 'contributions', 'certificates', 'documents', 'notifications', 'settings'].includes(activeNavTab)
                ? 'text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            aria-label="More navigation options"
          >
            <Menu className="w-5 h-5 shrink-0" />
            <span className="text-[10px] mt-1 leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* Member "More" Mobile Bottom Sheet Modal */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col justify-end lg:hidden">
          <div
            className="flex-1"
            onClick={() => setMoreMenuOpen(false)}
          />
          <div className="bg-[#011833] border-t border-sky-800 rounded-t-3xl p-5 text-white space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-slate-600 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-sky-900/60">
              <div>
                <h3 className="text-sm font-bold text-white font-serif">Member Portal Menu</h3>
                <p className="text-[10px] text-cyan-300">Member: {member.full_name} [{member.id}]</p>
              </div>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              {/* Interest Paid History Feature */}
              <button
                onClick={() => {
                  onNavTabChange('interest-paid');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-700/20 border border-amber-400/40 text-left transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <Percent className="w-4 h-4 text-amber-300" />
                  <span className="font-bold text-amber-200">Interest Paid History</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>

              <button
                onClick={() => {
                  onNavTabChange('profile');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 text-left transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>My Profile & Details</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  onNavTabChange('contributions');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 text-left transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>My Contributions Breakdown</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  onNavTabChange('certificates');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 text-left transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-amber-300" />
                  <span>Official Certificates</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  onNavTabChange('documents');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 text-left transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="w-4 h-4 text-blue-400" />
                  <span>Document Vault</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  onNavTabChange('notifications');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 text-left transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-cyan-400" />
                  <span>Notices & Announcements</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  onNavTabChange('settings');
                  setMoreMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 text-left transition-colors min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Change Security PIN</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {onOpenBrandKit && (
                <button
                  onClick={() => {
                    setMoreMenuOpen(false);
                    onOpenBrandKit();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/80 text-left transition-colors min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-cyan-300" />
                    <span>Official Seal & Branding</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

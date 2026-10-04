import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Member, Loan, LoanRepayment, OrgConfig, FinancialRules } from '../../types/index.js';
import { formatNPR } from '../../utils/pdf.js';
import {
  HandCoins,
  PlusCircle,
  Calculator,
  Search,
  CheckCircle,
  Eye,
  Receipt,
  UserCheck,
  AlertCircle,
  RefreshCw,
  X,
  CreditCard,
  Percent,
  Calendar,
  Sparkles
} from 'lucide-react';

interface LoanManagementProps {
  org: OrgConfig;
  financialRules?: FinancialRules;
  onOpenCalculator: () => void;
  onViewReceipt: (receipt: any) => void;
}

export const LoanManagement: React.FC<LoanManagementProps> = ({
  org,
  financialRules,
  onOpenCalculator,
  onViewReceipt
}) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<any[]>([]);
  const [profitSharingData, setProfitSharingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'loans' | 'profit-sharing'>('loans');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDistributeModal, setShowDistributeModal] = useState(false);

  // Selected Records
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedLoanRepayments, setSelectedLoanRepayments] = useState<LoanRepayment[]>([]);

  // Issue Loan Form
  const [issueData, setIssueData] = useState({
    memberId: '',
    loanAmount: '50000',
    interestRate: String(financialRules?.annualLoanInterestRate || 12.0),
    interestMethod: 'REDUCING_BALANCE',
    termMonths: '12',
    startDate: new Date().toISOString().split('T')[0],
    purpose: 'Income Generation / Cooperative Enterprise',
    guarantorName: '',
    guarantorPhone: '',
    notes: '',
    cashBankAccountId: ''
  });

  // Repayment Form
  const [repayData, setRepayData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    totalAmount: '',
    principalPortion: '',
    interestPortion: '',
    penaltyAmount: '0',
    paymentMethod: 'CASH',
    cashBankAccountId: '',
    notes: ''
  });

  // Profit Sharing Form
  const [distributeData, setDistributeData] = useState({
    title: 'Annual Cooperative Interest Dividend',
    periodStart: '2080-01-01',
    periodEnd: '2081-12-30',
    totalAmount: '',
    distributionDate: new Date().toISOString().split('T')[0],
    notes: 'Equal distribution of loan interest earnings among active members'
  });

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lRes, mRes, cbRes, psRes] = await Promise.all([
        api.getLoans({ status: statusFilter }),
        api.getMembers({ status: 'ACTIVE' }),
        api.getCashBank(),
        api.getProfitSharing()
      ]);
      setLoans(lRes.loans || []);
      setMembers(mRes.members || []);
      setCashBankAccounts(cbRes.accounts || []);
      setProfitSharingData(psRes);

      if (cbRes.accounts?.length > 0 && !issueData.cashBankAccountId) {
        setIssueData((prev) => ({ ...prev, cashBankAccountId: cbRes.accounts[0].id }));
      }
    } catch (err: any) {
      console.error('Fetch loans error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const openIssueModal = () => {
    setIssueData({
      memberId: members[0]?.id || '',
      loanAmount: '50000',
      interestRate: String(financialRules?.annualLoanInterestRate || 12.0),
      interestMethod: financialRules?.loanInterestMethod || 'REDUCING_BALANCE',
      termMonths: '12',
      startDate: new Date().toISOString().split('T')[0],
      purpose: 'Income Generation / Cooperative Enterprise',
      guarantorName: '',
      guarantorPhone: '',
      notes: '',
      cashBankAccountId: cashBankAccounts[0]?.id || ''
    });
    setActionError(null);
    setShowIssueModal(true);
  };

  const handleIssueLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await api.createLoan(issueData);
      setActionSuccess(`Loan ${res.loanId} created and disbursed successfully!`);
      setShowIssueModal(false);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create loan.');
    } finally {
      setSubmitting(false);
    }
  };

  const openRepayModal = (loan: Loan) => {
    setSelectedLoan(loan);
    // Suggest default monthly installment
    const monthlyRate = (loan.interest_rate / 100) / 12;
    const estInterest = Math.round(loan.remaining_principal * monthlyRate * 100) / 100;
    const estPrincipal = Math.min(loan.remaining_principal, Math.round((loan.loan_amount / loan.term_months) * 100) / 100);

    setRepayData({
      paymentDate: new Date().toISOString().split('T')[0],
      totalAmount: String(estPrincipal + estInterest),
      principalPortion: String(estPrincipal),
      interestPortion: String(estInterest),
      penaltyAmount: '0',
      paymentMethod: 'CASH',
      cashBankAccountId: cashBankAccounts[0]?.id || '',
      notes: `Installment payment for ${loan.id}`
    });
    setActionError(null);
    setShowRepaymentModal(true);
  };

  const handleRecordRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;

    setSubmitting(true);
    setActionError(null);
    try {
      const res = await api.recordLoanRepayment(selectedLoan.id, repayData);
      setShowRepaymentModal(false);
      setActionSuccess(res.isCleared ? `Payment recorded! Loan ${selectedLoan.id} is now FULLY CLEARED!` : `Repayment recorded! Receipt: ${res.receiptNo}`);
      fetchData();

      // Show receipt
      const member = members.find((m) => m.id === selectedLoan.member_id);
      onViewReceipt({
        receiptNo: res.receiptNo,
        date: repayData.paymentDate,
        memberId: selectedLoan.member_id,
        memberName: member?.full_name || selectedLoan.member_name || selectedLoan.member_id,
        category: `LOAN REPAYMENT (${selectedLoan.id})`,
        amount: parseFloat(repayData.totalAmount),
        paymentMethod: repayData.paymentMethod,
        description: `Loan EMI / Repayment (Principal: Rs. ${repayData.principalPortion}, Interest: Rs. ${repayData.interestPortion})`,
        balanceAfter: res.remainingPrincipal
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to record repayment.');
    } finally {
      setSubmitting(false);
    }
  };

  const openLoanDetail = async (loan: Loan) => {
    setSelectedLoan(loan);
    setShowDetailModal(true);
    try {
      const res = await api.getLoan(loan.id);
      setSelectedLoanRepayments(res.repayments || []);
    } catch (err: any) {
      console.error('Fetch loan details error:', err);
    }
  };

  const handleDistributeProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await api.distributeProfit(distributeData);
      setActionSuccess(`Successfully distributed Rs. ${res.equalShare} equally to each of ${res.memberCount} members' savings accounts!`);
      setShowDistributeModal(false);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to distribute profit.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalOutstanding = loans.reduce((sum, l) => sum + (l.status !== 'CLEARED' ? l.remaining_principal : 0), 0);
  const totalInterestCollected = profitSharingData?.totalInterestCollected || 0;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Loan Portfolio & Profit Sharing
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Credit facilities, EMI repayments, automatic loan clearance, and equal dividend distribution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenCalculator}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs min-h-[40px] cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-cyan-700" />
            <span>Loan Calculator</span>
          </button>
          <button
            onClick={openIssueModal}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm min-h-[40px] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-300" />
            <span>Issue Loan</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Loan Outstanding</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatNPR(totalOutstanding)}
          </div>
          <span className="text-[11px] text-slate-400">Total active cooperative credit deployed</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Interest Income Earned</span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {formatNPR(totalInterestCollected)}
          </div>
          <span className="text-[11px] text-slate-400">Total distributable cooperative earnings</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Standard Interest Policy</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {financialRules?.annualLoanInterestRate || 12.0}% p.a.
          </div>
          <span className="text-[11px] text-slate-400">1.0% monthly · Reducing Balance</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-between items-center border-b border-slate-200 text-xs font-semibold">
        <div className="flex">
          <button
            onClick={() => setActiveTab('loans')}
            className={`py-2.5 px-4 border-b-2 transition-colors ${
              activeTab === 'loans'
                ? 'border-amber-600 text-amber-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Loan Accounts ({loans.length})
          </button>
          <button
            onClick={() => setActiveTab('profit-sharing')}
            className={`py-2.5 px-4 border-b-2 transition-colors ${
              activeTab === 'profit-sharing'
                ? 'border-amber-600 text-amber-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Equal Profit / Interest Sharing
          </button>
        </div>

        {activeTab === 'loans' && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 mr-1">Status:</span>
            {['ALL', 'ACTIVE', 'CLEARED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  statusFilter === st ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loans Table */}
      {activeTab === 'loans' && (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Loan ID</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Disbursed Date</th>
                  <th className="py-3 px-4">Loan Amount</th>
                  <th className="py-3 px-4">Principal Paid</th>
                  <th className="py-3 px-4">Outstanding</th>
                  <th className="py-3 px-4">Rate & Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <HandCoins className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No loan records found</p>
                      <p className="text-[11px] text-slate-400 mt-1">Issue a loan to an active cooperative member to populate this ledger.</p>
                    </td>
                  </tr>
                ) : (
                  loans.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-800">{l.id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {l.member_name}
                        <span className="block text-[10px] text-slate-400 font-mono">{l.member_id}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{l.disbursement_date || l.application_date}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatNPR(l.loan_amount)}</td>
                      <td className="py-3 px-4 font-mono text-emerald-700">{formatNPR(l.principal_paid)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-700">{formatNPR(l.remaining_principal)}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {l.interest_rate}% p.a.
                        <span className="block text-[10px] text-slate-400">{l.interest_method === 'FLAT_RATE' ? 'Flat' : 'Reducing'}</span>
                      </td>
                      <td className="py-3 px-4">
                        {l.status === 'CLEARED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3 h-3" />
                            CLEARED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openLoanDetail(l)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="View Loan Statement & Repayments"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {l.status !== 'CLEARED' && (
                            <button
                              onClick={() => openRepayModal(l)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-[11px] flex items-center gap-1 shadow-xs"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Repay</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profit Sharing View */}
      {activeTab === 'profit-sharing' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Equal Interest / Profit Sharing Pool</h3>
                <p className="text-xs text-slate-500">
                  Business Rule: All loan interest income collected is distributed equally among active eligible members.
                </p>
              </div>

              <button
                onClick={() => {
                  setDistributeData({
                    ...distributeData,
                    totalAmount: String(totalInterestCollected)
                  });
                  setShowDistributeModal(true);
                }}
                disabled={totalInterestCollected <= 0}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Distribute Profit to Member Savings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Total Distributable Interest</span>
                <div className="text-2xl font-bold font-mono text-amber-950 mt-1">
                  {formatNPR(totalInterestCollected)}
                </div>
                <span className="text-[11px] text-amber-700">Cumulative interest received from loans</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Eligible Active Members</span>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {profitSharingData?.eligibleMemberCount || 0}
                </div>
                <span className="text-[11px] text-slate-400">Equal share entitlement</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Calculated Equal Share per Member</span>
                <div className="text-2xl font-bold font-mono text-emerald-950 mt-1">
                  {formatNPR(
                    profitSharingData?.eligibleMemberCount > 0
                      ? totalInterestCollected / profitSharingData.eligibleMemberCount
                      : 0
                  )}
                </div>
                <span className="text-[11px] text-emerald-700">Credited directly to each savings account</span>
              </div>
            </div>

            {/* Distribution History */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Previous Distribution Records</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Distribution Date</th>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Members</th>
                      <th className="py-2.5 px-3">Share per Member</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {profitSharingData?.previousDistributions?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                          No profit distributions finalized yet.
                        </td>
                      </tr>
                    ) : (
                      profitSharingData?.previousDistributions?.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">{d.title}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-sans">{d.distribution_date}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-sans">{d.period_start} to {d.period_end}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{formatNPR(d.total_distributable_amount)}</td>
                          <td className="py-2.5 px-3 text-slate-700">{d.eligible_member_count}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700">{formatNPR(d.share_per_member)}</td>
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

      {/* ================= ISSUE LOAN MODAL ================= */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Issue Cooperative Loan</h3>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIssueLoan} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Borrowing Member *</label>
                <select
                  required
                  value={issueData.memberId}
                  onChange={(e) => setIssueData({ ...issueData, memberId: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Select Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} - {m.full_name} ({m.mobile_phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Principal (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="1000"
                    value={issueData.loanAmount}
                    onChange={(e) => setIssueData({ ...issueData, loanAmount: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono font-bold text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Months) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={issueData.termMonths}
                    onChange={(e) => setIssueData({ ...issueData, termMonths: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={issueData.interestRate}
                    onChange={(e) => setIssueData({ ...issueData, interestRate: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Method</label>
                  <select
                    value={issueData.interestMethod}
                    onChange={(e) => setIssueData({ ...issueData, interestMethod: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="REDUCING_BALANCE">Reducing Balance (Standard)</option>
                    <option value="FLAT_RATE">Flat Rate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Source Account</label>
                <select
                  value={issueData.cashBankAccountId}
                  onChange={(e) => setIssueData({ ...issueData, cashBankAccountId: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                >
                  {cashBankAccounts.map((cb) => (
                    <option key={cb.id} value={cb.id}>
                      {cb.account_name} ({formatNPR(cb.current_balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Purpose</label>
                <input
                  type="text"
                  value={issueData.purpose}
                  onChange={(e) => setIssueData({ ...issueData, purpose: e.target.value })}
                  placeholder="e.g. Agricultural equipment, business expansion"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Guarantor Name</label>
                  <input
                    type="text"
                    value={issueData.guarantorName}
                    onChange={(e) => setIssueData({ ...issueData, guarantorName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Guarantor Phone</label>
                  <input
                    type="text"
                    value={issueData.guarantorPhone}
                    onChange={(e) => setIssueData({ ...issueData, guarantorPhone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
                >
                  {submitting ? 'Disbursing...' : 'Disburse Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= REPAYMENT MODAL ================= */}
      {showRepaymentModal && selectedLoan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Record Loan Repayment ({selectedLoan.id})</h3>
              </div>
              <button onClick={() => setShowRepaymentModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordRepayment} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {actionError}
                </div>
              )}

              {/* Outstanding overview */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs flex justify-between items-center">
                <div>
                  <span className="text-amber-800 block">Remaining Principal</span>
                  <span className="text-base font-bold font-mono text-amber-950">
                    {formatNPR(selectedLoan.remaining_principal)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-amber-800 block">Borrower</span>
                  <span className="font-semibold text-slate-900">{selectedLoan.member_name}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Repayment Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={repayData.totalAmount}
                  onChange={(e) => {
                    const total = parseFloat(e.target.value) || 0;
                    // Auto-calculate interest vs principal
                    const monthlyRate = (selectedLoan.interest_rate / 100) / 12;
                    const estInterest = Math.round(selectedLoan.remaining_principal * monthlyRate * 100) / 100;
                    const interest = Math.min(total, estInterest);
                    const principal = Math.min(selectedLoan.remaining_principal, Math.round((total - interest) * 100) / 100);
                    setRepayData({
                      ...repayData,
                      totalAmount: e.target.value,
                      principalPortion: String(principal),
                      interestPortion: String(interest)
                    });
                  }}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono font-bold text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Principal Portion (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    value={repayData.principalPortion}
                    onChange={(e) => setRepayData({ ...repayData, principalPortion: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Portion (Rs.)</label>
                  <input
                    type="number"
                    step="any"
                    value={repayData.interestPortion}
                    onChange={(e) => setRepayData({ ...repayData, interestPortion: e.target.value })}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={repayData.paymentMethod}
                    onChange={(e) => setRepayData({ ...repayData, paymentMethod: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deposit Into</label>
                  <select
                    value={repayData.cashBankAccountId}
                    onChange={(e) => setRepayData({ ...repayData, cashBankAccountId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  >
                    {cashBankAccounts.map((cb) => (
                      <option key={cb.id} value={cb.id}>
                        {cb.account_name} ({formatNPR(cb.current_balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={repayData.paymentDate}
                  onChange={(e) => setRepayData({ ...repayData, paymentDate: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRepaymentModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
                >
                  {submitting ? 'Recording...' : 'Record Payment & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= LOAN DETAIL & REPAYMENT STATEMENT MODAL ================= */}
      {showDetailModal && selectedLoan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Loan Statement: {selectedLoan.id}</h3>
                {selectedLoan.status === 'CLEARED' && (
                  <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded">
                    CLEARED
                  </span>
                )}
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Top metadata */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Borrower</span>
                  <span className="font-bold text-slate-900">{selectedLoan.member_name}</span>
                  <span className="block text-[10px] text-slate-500 font-mono">{selectedLoan.member_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Disbursed Amount</span>
                  <span className="font-bold font-mono text-slate-900">{formatNPR(selectedLoan.loan_amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Principal Repaid</span>
                  <span className="font-bold font-mono text-emerald-700">{formatNPR(selectedLoan.principal_paid)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Remaining Principal</span>
                  <span className="font-bold font-mono text-rose-700">{formatNPR(selectedLoan.remaining_principal)}</span>
                </div>
              </div>

              {/* Repayments History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Complete Repayment Journal</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Receipt No</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Total Paid</th>
                        <th className="py-2.5 px-3">Principal</th>
                        <th className="py-2.5 px-3">Interest</th>
                        <th className="py-2.5 px-3">Balance After</th>
                        <th className="py-2.5 px-3 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {selectedLoanRepayments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                            No repayments logged for this loan yet.
                          </td>
                        </tr>
                      ) : (
                        selectedLoanRepayments.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-900">{r.receipt_no}</td>
                            <td className="py-2 px-3 text-slate-600 font-sans">{r.payment_date}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{formatNPR(r.total_amount)}</td>
                            <td className="py-2 px-3 text-emerald-700">{formatNPR(r.principal_amount)}</td>
                            <td className="py-2 px-3 text-amber-700">{formatNPR(r.interest_amount)}</td>
                            <td className="py-2 px-3 text-slate-600">{formatNPR(r.remaining_principal_after)}</td>
                            <td className="py-2 px-3 text-right font-sans">
                              <button
                                onClick={() => {
                                  setShowDetailModal(false);
                                  onViewReceipt({
                                    receiptNo: r.receipt_no,
                                    date: r.payment_date,
                                    memberId: selectedLoan.member_id,
                                    memberName: selectedLoan.member_name || selectedLoan.member_id,
                                    category: `LOAN REPAYMENT (${selectedLoan.id})`,
                                    amount: r.total_amount,
                                    paymentMethod: r.payment_method,
                                    description: `EMI repayment: Principal ${formatNPR(r.principal_amount)}, Interest ${formatNPR(r.interest_amount)}`,
                                    balanceAfter: r.remaining_principal_after
                                  });
                                }}
                                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[10px]"
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

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PROFIT DISTRIBUTION MODAL ================= */}
      {showDistributeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Execute Equal Profit Distribution</h3>
              </div>
              <button onClick={() => setShowDistributeModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDistributeProfit} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                This will automatically divide the distributable amount equally among all <strong>{profitSharingData?.eligibleMemberCount || 0} active members</strong> and credit the funds directly to their savings accounts.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Distribution Title</label>
                <input
                  type="text"
                  required
                  value={distributeData.title}
                  onChange={(e) => setDistributeData({ ...distributeData, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Total Distributable Amount (Rs.)</label>
                <input
                  type="number"
                  required
                  step="any"
                  value={distributeData.totalAmount}
                  onChange={(e) => setDistributeData({ ...distributeData, totalAmount: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono font-bold text-base"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Period Start</label>
                  <input
                    type="date"
                    value={distributeData.periodStart}
                    onChange={(e) => setDistributeData({ ...distributeData, periodStart: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Period End</label>
                  <input
                    type="date"
                    value={distributeData.periodEnd}
                    onChange={(e) => setDistributeData({ ...distributeData, periodEnd: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDistributeModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
                >
                  {submitting ? 'Distributing...' : 'Execute Equal Distribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

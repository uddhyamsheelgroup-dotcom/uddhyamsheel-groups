import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Member, SavingsAccount, SavingsTransaction, OrgConfig } from '../../types/index.js';
import { formatNPR } from '../../utils/pdf.js';
import {
  PiggyBank,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Filter,
  Receipt,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface SavingsManagementProps {
  org: OrgConfig;
  onViewReceipt: (receipt: any) => void;
}

export const SavingsManagement: React.FC<SavingsManagementProps> = ({ org, onViewReceipt }) => {
  const [accounts, setAccounts] = useState<SavingsAccount[]>([]);
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions'>('accounts');

  // Transaction Modal
  const [showModal, setShowModal] = useState(false);
  const [txType, setTxType] = useState<'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT'>('DEPOSIT');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashBankAccountId, setCashBankAccountId] = useState('');
  const [description, setDescription] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, txRes, memRes, cbRes] = await Promise.all([
        api.getSavingsAccounts(),
        api.getSavingsTransactions(),
        api.getMembers({ status: 'ACTIVE' }),
        api.getCashBank()
      ]);
      setAccounts(accRes.accounts || []);
      setSummary(accRes.summary || {});
      setTransactions(txRes.transactions || []);
      setMembers(memRes.members || []);
      setCashBankAccounts(cbRes.accounts || []);

      if (cbRes.accounts?.length > 0 && !cashBankAccountId) {
        setCashBankAccountId(cbRes.accounts[0].id);
      }
    } catch (err: any) {
      console.error('Fetch savings data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openTxModal = (type: 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT', memberId?: string) => {
    setTxType(type);
    setSelectedMemberId(memberId || (members[0]?.id || ''));
    setAmount('');
    setDescription('');
    setActionError(null);
    setShowModal(true);
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!selectedMemberId || isNaN(numAmount) || numAmount <= 0) {
      setActionError('Please select a member and enter a valid positive amount.');
      return;
    }

    // Check withdrawal balance
    if (txType === 'WITHDRAWAL') {
      const targetAcc = accounts.find((a) => a.member_id === selectedMemberId);
      if (targetAcc && numAmount > targetAcc.balance) {
        setActionError(`Cannot withdraw Rs. ${numAmount.toLocaleString()}. Current balance is only Rs. ${targetAcc.balance.toLocaleString()}. Negative balance is forbidden.`);
        return;
      }
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const res = await api.recordSavingsTransaction({
        memberId: selectedMemberId,
        type: txType,
        amount: numAmount,
        date: txDate,
        paymentMethod,
        cashBankAccountId,
        description: description || `Savings ${txType.toLowerCase()}`
      });

      const member = members.find((m) => m.id === selectedMemberId);
      setShowModal(false);
      setActionSuccess(`Savings transaction posted successfully! Receipt: ${res.receiptNo}`);
      fetchData();

      // Show receipt modal
      onViewReceipt({
        receiptNo: res.receiptNo,
        date: txDate,
        memberId: selectedMemberId,
        memberName: member?.full_name || selectedMemberId,
        category: `SAVINGS ${txType}`,
        amount: numAmount,
        paymentMethod,
        description: description || `Savings account ${txType.toLowerCase()}`,
        balanceAfter: res.balanceAfter
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to record transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Savings Accounts & Deposits
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Member savings ledger, deposits, withdrawals, and interest postings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openTxModal('DEPOSIT')}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm min-h-[40px] cursor-pointer"
          >
            <ArrowDownRight className="w-4 h-4 text-emerald-200" />
            <span>Deposit Savings</span>
          </button>
          <button
            onClick={() => openTxModal('WITHDRAWAL')}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs min-h-[40px] cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
            <span>Withdraw Savings</span>
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

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Savings Held</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatNPR(summary.total_savings || 0)}
          </div>
          <span className="text-[11px] text-slate-400">Cooperative member deposits liability</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Savings Accounts</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {summary.total_accounts || 0}
          </div>
          <span className="text-[11px] text-slate-400">Linked to individual members</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Average Savings per Member</span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {formatNPR(summary.total_accounts > 0 ? summary.total_savings / summary.total_accounts : 0)}
          </div>
          <span className="text-[11px] text-slate-400">Per-capita member liquidity</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === 'accounts'
              ? 'border-amber-600 text-amber-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Member Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === 'transactions'
              ? 'border-amber-600 text-amber-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Transaction Journal ({transactions.length})
        </button>
      </div>

      {/* Accounts View */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Member ID</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Savings A/C Number</th>
                  <th className="py-3 px-4">Current Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <PiggyBank className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No savings accounts yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">Savings accounts are automatically opened whenever a member is registered.</p>
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-800">{acc.member_id}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{acc.member_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{acc.account_number}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-950">{formatNPR(acc.balance)}</td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-700 font-medium text-[11px]">Active</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openTxModal('DEPOSIT', acc.member_id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[11px]"
                          >
                            + Deposit
                          </button>
                          <button
                            onClick={() => openTxModal('WITHDRAWAL', acc.member_id)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[11px]"
                          >
                            - Withdraw
                          </button>
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

      {/* Transactions View */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Balance After</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No savings transactions recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{tx.receipt_no}</td>
                      <td className="py-3 px-4 text-slate-600 font-sans">{tx.date}</td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                        {tx.member_name} <span className="text-slate-400 font-mono">[{tx.member_id}]</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${tx.type === 'WITHDRAWAL' ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-950">{formatNPR(tx.amount)}</td>
                      <td className="py-3 px-4 text-slate-600">{formatNPR(tx.balance_after)}</td>
                      <td className="py-3 px-4 text-slate-600 font-sans max-w-[180px] truncate">{tx.description}</td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() =>
                            onViewReceipt({
                              receiptNo: tx.receipt_no,
                              date: tx.date,
                              memberId: tx.member_id,
                              memberName: tx.member_name || tx.member_id,
                              category: `SAVINGS ${tx.type}`,
                              amount: tx.amount,
                              paymentMethod: tx.payment_method,
                              description: tx.description,
                              balanceAfter: tx.balance_after
                            })
                          }
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Record Savings {txType}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordTransaction} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Member *</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} - {m.full_name} ({m.mobile_phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('DEPOSIT')}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      txType === 'DEPOSIT'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Deposit (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('WITHDRAWAL')}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      txType === 'WITHDRAWAL'
                        ? 'bg-rose-50 border-rose-600 text-rose-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Withdrawal (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono text-base font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer / QR</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Impact</label>
                  <select
                    value={cashBankAccountId}
                    onChange={(e) => setCashBankAccountId(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Date</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Regular monthly voluntary savings deposit"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
                >
                  {submitting ? 'Recording...' : 'Record & Issue Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

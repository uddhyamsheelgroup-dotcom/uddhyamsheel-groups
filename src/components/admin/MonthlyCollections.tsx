import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Member, Contribution, OrgConfig, FinancialRules } from '../../types/index.js';
import { formatNPR } from '../../utils/pdf.js';
import {
  Coins,
  PlusCircle,
  Calendar,
  Search,
  Filter,
  Receipt,
  Printer,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  AlertCircle
} from 'lucide-react';

interface MonthlyCollectionsProps {
  org: OrgConfig;
  financialRules?: FinancialRules;
  onViewReceipt: (receipt: any) => void;
}

export const MonthlyCollections: React.FC<MonthlyCollectionsProps> = ({
  org,
  financialRules,
  onViewReceipt
}) => {
  const [selectedYear, setSelectedYear] = useState(2081);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [cashBankAccounts, setCashBankAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

  // Record Contribution Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [monthBS, setMonthBS] = useState(1);
  const [amount, setAmount] = useState(String(financialRules?.monthlyContributionAmount || 1000));
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashBankAccountId, setCashBankAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matRes, conRes, memRes, cbRes] = await Promise.all([
        api.getContributionMatrix(selectedYear),
        api.getContributions({ year: selectedYear }),
        api.getMembers({ status: 'ACTIVE' }),
        api.getCashBank()
      ]);
      setMatrixData(matRes);
      setContributions(conRes.contributions || []);
      setMembers(memRes.members || []);
      setCashBankAccounts(cbRes.accounts || []);

      if (cbRes.accounts?.length > 0 && !cashBankAccountId) {
        setCashBankAccountId(cbRes.accounts[0].id);
      }
    } catch (err: any) {
      console.error('Fetch contributions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const openRecordModal = (memberId?: string, month?: number) => {
    setSelectedMemberId(memberId || (members[0]?.id || ''));
    setMonthBS(month || 1);
    setAmount(String(financialRules?.monthlyContributionAmount || 1000));
    setNotes('');
    setActionError(null);
    setShowModal(true);
  };

  const handleRecordContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!selectedMemberId || isNaN(numAmount) || numAmount <= 0) {
      setActionError('Valid member and positive contribution amount are required.');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      const res = await api.recordContribution({
        memberId: selectedMemberId,
        yearBS: selectedYear,
        monthBS,
        amount: numAmount,
        paymentMethod,
        cashBankAccountId,
        paymentDate,
        notes
      });

      const member = members.find((m) => m.id === selectedMemberId);
      const monthName = matrixData?.months?.find((m: any) => m.no === monthBS)?.name || `Month ${monthBS}`;
      setShowModal(false);
      setActionSuccess(`Monthly contribution recorded successfully! Receipt: ${res.receiptNo}`);
      fetchData();

      // Show receipt
      onViewReceipt({
        receiptNo: res.receiptNo,
        date: paymentDate,
        memberId: selectedMemberId,
        memberName: member?.full_name || selectedMemberId,
        category: `MONTHLY CONTRIBUTION (${monthName} ${selectedYear} B.S.)`,
        amount: numAmount,
        paymentMethod,
        description: `Monthly cooperative solidarity contribution for ${monthName} ${selectedYear} B.S.`
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to record contribution.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCollectedInYear = contributions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Monthly Collections & Dues
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Preserve and track cooperative monthly contributions and member equity payments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <div className="flex flex-wrap items-center bg-white border border-slate-300 rounded-xl p-1 text-xs shadow-2xs">
            <span className="text-slate-500 px-2 font-medium">B.S. Year:</span>
            {[2079, 2080, 2081, 2082, 2083].map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors min-h-[32px] cursor-pointer ${
                  selectedYear === y ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <button
            onClick={() => openRecordModal()}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm min-h-[40px] cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-300" />
            <span>Record Contribution</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Overview Metric Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Collections in {selectedYear} B.S.</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {formatNPR(totalCollectedInYear)}
          </div>
          <span className="text-[11px] text-slate-400">Total member payments received</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Active Contributing Members</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {matrixData?.matrix?.length || 0}
          </div>
          <span className="text-[11px] text-slate-400">Eligible contributors in cooperative</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Standard Monthly Rate</span>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {formatNPR(financialRules?.monthlyContributionAmount || 1000)}
          </div>
          <span className="text-[11px] text-slate-400">Configurable in System Settings</span>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              viewMode === 'matrix' ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Year Matrix ({selectedYear} B.S.)
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              viewMode === 'list' ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payment Journal ({contributions.length})
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Collection Report</span>
        </button>
      </div>

      {/* Matrix View (Member vs 12 Months) */}
      {viewMode === 'matrix' && (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>
              <strong>Contribution Tracking Matrix:</strong> Green indicator signifies paid. Click any month cell to quickly record payment.
            </span>
            <span className="font-mono font-bold text-slate-800">{selectedYear} B.S.</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-900 z-10">Member</th>
                  {matrixData?.months?.map((m: any) => (
                    <th key={m.no} className="py-2.5 px-2 text-center whitespace-nowrap">
                      {m.name.substring(0, 3)}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Total (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {matrixData?.matrix?.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-12 text-center text-slate-400">
                      <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <span>No members registered to track.</span>
                    </td>
                  </tr>
                ) : (
                  matrixData?.matrix?.map((row: any) => (
                    <tr key={row.memberId} className="hover:bg-slate-50">
                      <td className="py-2 px-3 sticky left-0 bg-white hover:bg-slate-50 font-medium text-slate-900 whitespace-nowrap shadow-xs">
                        <span className="font-mono text-amber-800 font-bold mr-1.5">{row.memberId}</span>
                        {row.fullName}
                      </td>
                      {matrixData?.months?.map((m: any) => {
                        const cell = row.months[m.no];
                        return (
                          <td key={m.no} className="py-2 px-2 text-center">
                            {cell ? (
                              <button
                                onClick={() =>
                                  onViewReceipt({
                                    receiptNo: cell.receiptNo,
                                    date: cell.date,
                                    memberId: row.memberId,
                                    memberName: row.fullName,
                                    category: `MONTHLY CONTRIBUTION (${m.name} ${selectedYear} B.S.)`,
                                    amount: cell.amount,
                                    paymentMethod: 'CASH',
                                    description: `Contribution for ${m.name} ${selectedYear}`
                                  })
                                }
                                className="w-6 h-6 rounded bg-emerald-100 text-emerald-800 font-bold inline-flex items-center justify-center text-[10px] hover:bg-emerald-200 transition-colors"
                                title={`Paid Rs. ${cell.amount} on ${cell.date} (${cell.receiptNo})`}
                              >
                                ✓
                              </button>
                            ) : (
                              <button
                                onClick={() => openRecordModal(row.memberId, m.no)}
                                className="w-6 h-6 rounded bg-slate-100 text-slate-400 font-medium inline-flex items-center justify-center text-[10px] hover:bg-amber-100 hover:text-amber-800 transition-colors"
                                title={`Mark ${m.name} as paid`}
                              >
                                -
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">
                        {formatNPR(row.totalPaid)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Contribution Period</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                {contributions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-sans">
                      <span>No contributions recorded for {selectedYear} B.S.</span>
                    </td>
                  </tr>
                ) : (
                  contributions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.receipt_no}</td>
                      <td className="py-3 px-4 font-sans text-slate-600">{c.payment_date}</td>
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                        {c.member_name} <span className="text-slate-400 font-mono">[{c.member_id}]</span>
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold text-amber-800">
                        {c.month_name} {c.year_bs} B.S.
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-950">{formatNPR(c.amount)}</td>
                      <td className="py-3 px-4 font-sans text-slate-600">{c.payment_method}</td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          onClick={() =>
                            onViewReceipt({
                              receiptNo: c.receipt_no,
                              date: c.payment_date,
                              memberId: c.member_id,
                              memberName: c.member_name || c.member_id,
                              category: `MONTHLY CONTRIBUTION (${c.month_name} ${c.year_bs})`,
                              amount: c.amount,
                              paymentMethod: c.payment_method,
                              description: `Contribution dues for ${c.month_name} ${c.year_bs} B.S.`
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

      {/* Record Contribution Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Record Member Contribution</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordContribution} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contributing Member *</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">B.S. Year</label>
                  <input
                    type="number"
                    disabled
                    value={selectedYear}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nepali Month *</label>
                  <select
                    value={monthBS}
                    onChange={(e) => setMonthBS(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  >
                    {matrixData?.months?.map((m: any) => (
                      <option key={m.no} value={m.no}>
                        {m.no}. {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contribution Amount (Rs.) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional collection remarks"
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
                  {submitting ? 'Recording...' : 'Record Payment & Issue Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

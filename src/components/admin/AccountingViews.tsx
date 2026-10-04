import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { CashBankAccount, CashBankTransaction, LedgerEntry, Investment, AssetLiability, OrgConfig } from '../../types/index.js';
import { formatNPR } from '../../utils/pdf.js';
import {
  Wallet,
  Building,
  TrendingUp,
  Building2,
  BookOpenText,
  ArrowRightLeft,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  X
} from 'lucide-react';

interface AccountingViewsProps {
  initialSubTab?: 'cash-bank' | 'ledger' | 'investments' | 'assets-liabilities';
  org: OrgConfig;
}

export const AccountingViews: React.FC<AccountingViewsProps> = ({ initialSubTab = 'cash-bank', org }) => {
  const [subTab, setSubTab] = useState<'cash-bank' | 'ledger' | 'investments' | 'assets-liabilities'>(initialSubTab);

  // Cash Bank state
  const [cashBankData, setCashBankData] = useState<{ accounts: CashBankAccount[]; transactions: CashBankTransaction[]; totals: any }>({ accounts: [], transactions: [], totals: {} });
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });

  // General Ledger state
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerTotals, setLedgerTotals] = useState<any>({});
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState('ALL');

  // Investments state
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investSummary, setInvestSummary] = useState<any>({});
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [investForm, setInvestForm] = useState({
    investmentType: 'FIXED_DEPOSIT',
    institutionName: '',
    amount: '',
    investmentDate: new Date().toISOString().split('T')[0],
    expectedReturnRate: '9.5',
    maturityDate: '',
    notes: ''
  });

  // Assets & Liabilities state
  const [assetLiabList, setAssetLiabList] = useState<AssetLiability[]>([]);
  const [assetLiabSummary, setAssetLiabSummary] = useState<any>({});
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState({
    type: 'ASSET' as 'ASSET' | 'LIABILITY',
    title: '',
    category: 'Equipment',
    acquisitionDate: new Date().toISOString().split('T')[0],
    originalAmount: '',
    currentValue: '',
    notes: ''
  });

  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCurrentTab = async () => {
    setLoading(true);
    setActionError(null);
    try {
      if (subTab === 'cash-bank') {
        const res = await api.getCashBank();
        setCashBankData(res);
        if (res.accounts?.length >= 2) {
          setTransferData((prev) => ({
            ...prev,
            fromAccountId: res.accounts[0].id,
            toAccountId: res.accounts[1].id
          }));
        }
      } else if (subTab === 'ledger') {
        const res = await api.getGeneralLedger({ account: ledgerCategoryFilter });
        setLedgerEntries(res.entries || []);
        setLedgerTotals(res.totals || {});
      } else if (subTab === 'investments') {
        const res = await api.getInvestments();
        setInvestments(res.investments || []);
        setInvestSummary(res.summary || {});
      } else if (subTab === 'assets-liabilities') {
        const res = await api.getAssetsLiabilities();
        setAssetLiabList(res.records || []);
        setAssetLiabSummary(res.summary || {});
      }
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentTab();
  }, [subTab, ledgerCategoryFilter]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.transferCashBank(transferData);
      setActionSuccess('Funds transferred successfully!');
      setShowTransferModal(false);
      fetchCurrentTab();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createInvestment(investForm);
      setActionSuccess('Investment recorded and posted to ledger!');
      setShowInvestModal(false);
      fetchCurrentTab();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAssetLiability(assetForm);
      setActionSuccess(`${assetForm.type} recorded successfully!`);
      setShowAssetModal(false);
      fetchCurrentTab();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Financial Accounting & Capital Assets
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Double-entry ledger, cash drawers, bank reconciliation, investments, and capital balance sheet
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setSubTab('cash-bank')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'cash-bank' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cash & Bank
          </button>
          <button
            onClick={() => setSubTab('ledger')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'ledger' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            General Ledger
          </button>
          <button
            onClick={() => setSubTab('investments')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'investments' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Investments
          </button>
          <button
            onClick={() => setSubTab('assets-liabilities')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              subTab === 'assets-liabilities' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Assets & Liabilities
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

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {actionError}
        </div>
      )}

      {/* ================= CASH & BANK SUBTAB ================= */}
      {subTab === 'cash-bank' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Operating Accounts</h3>
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Transfer Between Accounts</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cashBankData.accounts?.map((acc) => (
              <div key={acc.id} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-900">
                      {acc.type === 'CASH' ? <Wallet className="w-5 h-5 text-amber-700" /> : <Building className="w-5 h-5 text-indigo-700" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{acc.account_name}</h4>
                      <p className="text-[11px] text-slate-400">{acc.bank_name || 'Cash Reserve Drawer'}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono text-slate-500">{acc.type}</span>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Current Balance:</span>
                  <span className="text-2xl font-bold font-mono text-slate-950">{formatNPR(acc.current_balance)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cash/Bank Movement Ledger */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-900 text-white font-semibold text-xs flex justify-between">
              <span>Cash & Bank Movement History</span>
              <span className="text-amber-400 font-normal">Real-time audit reconciliation</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {cashBankData.transactions?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    cashBankData.transactions?.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600 font-sans">{t.date}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-900">{t.account_name}</td>
                        <td className="py-2 px-3">
                          <span className={`font-semibold ${t.amount < 0 || t.transaction_type.includes('OUT') || t.transaction_type.includes('DISBURSEMENT') ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {t.transaction_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600">{t.description}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{formatNPR(t.amount)}</td>
                        <td className="py-2 px-3 text-slate-600">{formatNPR(t.balance_after)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= GENERAL LEDGER SUBTAB ================= */}
      {subTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Balanced Double-Entry Journal</h3>
              <p className="text-xs text-slate-500">Every cooperative transaction posts equal debit and credit journal entries</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filter Account:</span>
              <select
                value={ledgerCategoryFilter}
                onChange={(e) => setLedgerCategoryFilter(e.target.value)}
                className="text-xs p-1.5 rounded-lg border border-slate-300"
              >
                <option value="ALL">All Accounts</option>
                <option value="Cash on Hand">Cash on Hand</option>
                <option value="Bank Account">Bank Account</option>
                <option value="Member Savings Liability">Member Savings Liability</option>
                <option value="Member Equity Contributions">Member Equity Contributions</option>
                <option value="Loans Receivable (Assets)">Loans Receivable (Assets)</option>
                <option value="Loan Interest Income">Loan Interest Income</option>
                <option value="Investments (Assets)">Investments (Assets)</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Ref No</th>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Debit (Rs.)</th>
                    <th className="py-3 px-4">Credit (Rs.)</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                        <BookOpenText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span>No ledger entries found.</span>
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-sans text-slate-600">{e.transaction_date}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{e.reference_no}</td>
                        <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">{e.account_name}</td>
                        <td className="py-2.5 px-4 font-sans text-slate-500 text-[10px] uppercase font-bold">{e.account_category}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-950">{e.debit > 0 ? formatNPR(e.debit) : '-'}</td>
                        <td className="py-2.5 px-4 font-bold text-amber-700">{e.credit > 0 ? formatNPR(e.credit) : '-'}</td>
                        <td className="py-2.5 px-4 font-sans text-slate-600 max-w-[200px] truncate">{e.description}</td>
                        <td className="py-2.5 px-4 font-sans text-slate-500">{e.created_by}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= INVESTMENTS SUBTAB ================= */}
      {subTab === 'investments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cooperative Investment Portfolio</h3>
              <p className="text-xs text-slate-500">Fixed deposits, treasury bonds, and cooperative federation investments</p>
            </div>
            <button
              onClick={() => setShowInvestModal(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Record Investment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 uppercase font-semibold">Total Invested</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {formatNPR(investSummary.total_invested || 0)}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 uppercase font-semibold">Returns Realized</span>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {formatNPR(investSummary.total_returns_received || 0)}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 uppercase font-semibold">Active Placements</span>
              <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
                {investSummary.total_count || 0}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Investment ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Institution / Partner</th>
                    <th className="py-2.5 px-3">Principal Amount</th>
                    <th className="py-2.5 px-3">Expected Return</th>
                    <th className="py-2.5 px-3">Maturity Date</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {investments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        No investment placements logged yet.
                      </td>
                    </tr>
                  ) : (
                    investments.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{inv.id}</td>
                        <td className="py-2 px-3 font-sans text-slate-700">{inv.investment_type}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-900">{inv.institution_name}</td>
                        <td className="py-2 px-3 font-bold text-slate-950">{formatNPR(inv.amount)}</td>
                        <td className="py-2 px-3 text-emerald-700">{inv.expected_return_rate}% ({formatNPR(inv.expected_return_amount || 0)})</td>
                        <td className="py-2 px-3 font-sans text-slate-600">{inv.maturity_date || 'Ongoing'}</td>
                        <td className="py-2 px-3 font-sans text-emerald-700 font-semibold">{inv.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= ASSETS & LIABILITIES SUBTAB ================= */}
      {subTab === 'assets-liabilities' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Capital Assets & Outside Liabilities</h3>
              <p className="text-xs text-slate-500">Physical assets, cooperative office property, and obligations</p>
            </div>
            <button
              onClick={() => setShowAssetModal(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Record Asset / Liability</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 uppercase font-semibold">Registered Capital Assets</span>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                {formatNPR(assetLiabSummary.total_assets || 0)}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 uppercase font-semibold">Registered External Liabilities</span>
              <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
                {formatNPR(assetLiabSummary.total_liabilities || 0)}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 uppercase font-semibold">Net Fixed Capital Position</span>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {formatNPR(assetLiabSummary.netPosition || 0)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Item ID</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Title / Item</th>
                    <th className="py-2.5 px-3">Acquisition Date</th>
                    <th className="py-2.5 px-3">Original Cost</th>
                    <th className="py-2.5 px-3">Current Book Value</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {assetLiabList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        No assets or external liabilities registered yet.
                      </td>
                    </tr>
                  ) : (
                    assetLiabList.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{a.id}</td>
                        <td className="py-2 px-3 font-sans font-semibold">
                          <span className={a.type === 'ASSET' ? 'text-emerald-700' : 'text-rose-700'}>{a.type}</span>
                        </td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-900">{a.title}</td>
                        <td className="py-2 px-3 font-sans text-slate-600">{a.acquisition_date}</td>
                        <td className="py-2 px-3 text-slate-600">{formatNPR(a.original_amount)}</td>
                        <td className="py-2 px-3 font-bold text-slate-950">{formatNPR(a.current_value)}</td>
                        <td className="py-2 px-3 font-sans text-slate-500">{a.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Transfer Between Accounts</h3>
            <form onSubmit={handleTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">From Account</label>
                <select
                  value={transferData.fromAccountId}
                  onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  {cashBankData.accounts?.map((a) => (
                    <option key={a.id} value={a.id}>{a.account_name} ({formatNPR(a.current_balance)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">To Account</label>
                <select
                  value={transferData.toAccountId}
                  onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  {cashBankData.accounts?.map((a) => (
                    <option key={a.id} value={a.id}>{a.account_name} ({formatNPR(a.current_balance)})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Amount (Rs.)</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                  className="w-full p-2 border rounded-lg font-mono font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTransferModal(false)} className="px-3 py-1.5 bg-slate-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold">Transfer Funds</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Investment Modal */}
      {showInvestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Record New Investment</h3>
            <form onSubmit={handleCreateInvestment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Investment Type</label>
                <select
                  value={investForm.investmentType}
                  onChange={(e) => setInvestForm({ ...investForm, investmentType: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="FIXED_DEPOSIT">Bank Fixed Deposit</option>
                  <option value="COOPERATIVE_FEDERATION">Cooperative Federation Share</option>
                  <option value="TREASURY_BOND">Government Treasury Bond</option>
                  <option value="BUSINESS_VENTURE">Cooperative Business Venture</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Institution Name *</label>
                <input
                  type="text"
                  required
                  value={investForm.institutionName}
                  onChange={(e) => setInvestForm({ ...investForm, institutionName: e.target.value })}
                  placeholder="e.g. National Cooperative Bank Ltd."
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={investForm.amount}
                    onChange={(e) => setInvestForm({ ...investForm, amount: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Expected Return (% p.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={investForm.expectedReturnRate}
                    onChange={(e) => setInvestForm({ ...investForm, expectedReturnRate: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowInvestModal(false)} className="px-3 py-1.5 bg-slate-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold">Save Investment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Record Asset / Liability</h3>
            <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAssetForm({ ...assetForm, type: 'ASSET' })}
                  className={`py-2 rounded font-semibold border ${assetForm.type === 'ASSET' ? 'bg-emerald-50 border-emerald-600 text-emerald-800' : 'border-slate-200'}`}
                >
                  Asset (+)
                </button>
                <button
                  type="button"
                  onClick={() => setAssetForm({ ...assetForm, type: 'LIABILITY' })}
                  className={`py-2 rounded font-semibold border ${assetForm.type === 'LIABILITY' ? 'bg-rose-50 border-rose-600 text-rose-800' : 'border-slate-200'}`}
                >
                  Liability (-)
                </button>
              </div>
              <div>
                <label className="block font-semibold mb-1">Item Title *</label>
                <input
                  type="text"
                  required
                  value={assetForm.title}
                  onChange={(e) => setAssetForm({ ...assetForm, title: e.target.value })}
                  placeholder="e.g. Office Computer & Printer or Bank Credit Facility"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Original Cost (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={assetForm.originalAmount}
                    onChange={(e) => setAssetForm({ ...assetForm, originalAmount: e.target.value, currentValue: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Current Book Value</label>
                  <input
                    type="number"
                    value={assetForm.currentValue}
                    onChange={(e) => setAssetForm({ ...assetForm, currentValue: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAssetModal(false)} className="px-3 py-1.5 bg-slate-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Member, OrgConfig } from '../../types/index.js';
import { formatNPR } from '../../utils/pdf.js';
import { LOGO_DATA_URI, STAMP_DATA_URI } from '../../assets/branding.js';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  Filter,
  Users,
  Coins,
  PiggyBank,
  HandCoins,
  Wallet,
  Building,
  TrendingUp,
  Building2,
  BookOpenText,
  FileText,
  Calendar
} from 'lucide-react';

interface ReportsViewProps {
  org: OrgConfig;
  initialMemberId?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ org, initialMemberId }) => {
  const [selectedReport, setSelectedReport] = useState<string>('financial-summary');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialMemberId || '');
  const [statementData, setStatementData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getMembers({ status: 'ACTIVE' }).then((res) => {
      setMembers(res.members || []);
      if (!selectedMemberId && res.members?.length > 0) {
        setSelectedMemberId(res.members[0].id);
      }
    });
    api.getDashboardSummary().then((res) => setDashboardData(res));
  }, []);

  useEffect(() => {
    if (selectedReport === 'member-statement' && selectedMemberId) {
      setLoading(true);
      api.getMemberStatement(selectedMemberId)
        .then((res) => setStatementData(res))
        .finally(() => setLoading(false));
    }
  }, [selectedReport, selectedMemberId]);

  const reportList = [
    { id: 'financial-summary', label: 'Financial Summary & Position', icon: FileSpreadsheet },
    { id: 'member-statement', label: 'Individual Member Statement', icon: FileText },
    { id: 'member-report', label: 'Membership Roster Report', icon: Users },
    { id: 'contribution-report', label: 'Monthly Contributions Report', icon: Coins },
    { id: 'savings-report', label: 'Savings & Deposits Report', icon: PiggyBank },
    { id: 'loan-report', label: 'Loan Portfolio & Clearance Report', icon: HandCoins },
    { id: 'interest-report', label: 'Loan Interest Income Report', icon: TrendingUp },
    { id: 'cash-bank-report', label: 'Cash & Bank Reconciliation', icon: Wallet },
    { id: 'investments-report', label: 'Investments Report', icon: Building },
    { id: 'assets-report', label: 'Fixed Assets & Liabilities', icon: Building2 },
    { id: 'ledger-report', label: 'General Ledger Audit', icon: BookOpenText },
  ];

  const handlePrint = () => {
    window.print();
  };

  const s = dashboardData?.summary || {};

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Official Cooperative Reports & Statements
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade financial documentation for {org.name || 'Uddhyamsheel Group'}
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-3.5 py-2 bg-gradient-to-r from-slate-900 to-blue-950 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm min-h-[40px] cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>Print / Export Document</span>
        </button>
      </div>

      {/* Report Selector Strip */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 rounded-xl">
        {reportList.map((r) => {
          const Icon = r.icon;
          const isSelected = selectedReport === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* Member Selector if Member Statement is active */}
      {selectedReport === 'member-statement' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Member:</label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="text-xs p-2 rounded-lg border border-slate-300 font-medium"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} - {m.full_name} ({m.mobile_phone})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Printable Report Document Paper */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 p-8 shadow-sm print:p-0 print:border-none" id="printable-report">
        {/* Organization Official Header */}
        <div className="text-center border-b-2 border-slate-900 pb-5 mb-6">
          <h2 className="text-2xl font-serif font-extrabold text-slate-950 tracking-wider">
            {org.name || 'UDDHYAMSHEEL GROUP'}
          </h2>
          <div className="text-sm font-semibold text-amber-800">{org.nepaliName || 'उद्यमशील समूह'}</div>
          <div className="text-xs text-slate-600 mt-1">
            {org.address || 'Lumbini, Nepal'} · Estd. {org.establishedBS || '2079 B.S.'} · Phone: {org.phone} · Email: {org.email}
          </div>
          <div className="mt-4 inline-block bg-slate-900 text-white text-xs font-bold px-4 py-1.5 uppercase tracking-widest rounded-sm">
            {reportList.find((r) => r.id === selectedReport)?.label || 'OFFICIAL REPORT'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Generated on: {new Date().toISOString().split('T')[0]} · Authoritative Database Extract
          </div>
        </div>

        {/* 1. FINANCIAL SUMMARY REPORT */}
        {selectedReport === 'financial-summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 border rounded-lg">
                <span className="text-slate-500 font-sans block text-[11px]">Total Members</span>
                <span className="text-lg font-bold text-slate-900">{s.totalMembers || 0}</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg">
                <span className="text-slate-500 font-sans block text-[11px]">Total Savings</span>
                <span className="text-lg font-bold text-slate-900">{formatNPR(s.totalSavings || 0)}</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg">
                <span className="text-slate-500 font-sans block text-[11px]">Outstanding Credit</span>
                <span className="text-lg font-bold text-slate-900">{formatNPR(s.outstandingLoans || 0)}</span>
              </div>
              <div className="p-3 bg-slate-50 border rounded-lg">
                <span className="text-slate-500 font-sans block text-[11px]">Liquid Cash & Bank</span>
                <span className="text-lg font-bold text-slate-900">{formatNPR((s.cashBalance || 0) + (s.bankBalance || 0))}</span>
              </div>
            </div>

            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="py-2.5 px-3">Financial Head</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">Amount (NPR)</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-[11px]">
                <tr>
                  <td className="py-2 px-3 font-sans font-medium">Cash on Hand (Main Drawer)</td>
                  <td className="py-2 px-3 font-sans text-slate-500">Liquid Asset</td>
                  <td className="py-2 px-3 text-right font-bold">{formatNPR(s.cashBalance || 0)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium">Bank Operating Accounts</td>
                  <td className="py-2 px-3 font-sans text-slate-500">Liquid Asset</td>
                  <td className="py-2 px-3 text-right font-bold">{formatNPR(s.bankBalance || 0)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium">Loans Receivable Portfolio</td>
                  <td className="py-2 px-3 font-sans text-slate-500">Credit Asset</td>
                  <td className="py-2 px-3 text-right font-bold">{formatNPR(s.outstandingLoans || 0)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium">Investments (Fixed Deposits & Federation)</td>
                  <td className="py-2 px-3 font-sans text-slate-500">Investment Asset</td>
                  <td className="py-2 px-3 text-right font-bold">{formatNPR(s.investments || 0)}</td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={2} className="py-2.5 px-3 font-sans">TOTAL FINANCIAL ASSETS</td>
                  <td className="py-2.5 px-3 text-right text-slate-950 font-bold text-sm">{formatNPR(s.totalAssets || 0)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-medium">Member Voluntary Savings</td>
                  <td className="py-2 px-3 font-sans text-slate-500">Member Liability</td>
                  <td className="py-2 px-3 text-right font-bold text-rose-700">{formatNPR(s.totalSavings || 0)}</td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={2} className="py-2.5 px-3 font-sans">TOTAL COOPERATIVE LIABILITIES</td>
                  <td className="py-2.5 px-3 text-right text-rose-700 font-bold text-sm">{formatNPR(s.totalLiabilities || 0)}</td>
                </tr>
                <tr className="bg-amber-50 font-bold border-t-2 border-slate-900">
                  <td colSpan={2} className="py-3 px-3 font-sans text-amber-950">NET CAPITAL POSITION (EQUITY)</td>
                  <td className="py-3 px-3 text-right text-amber-950 font-bold text-base">{formatNPR(s.netPosition || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 2. MEMBER STATEMENT REPORT */}
        {selectedReport === 'member-statement' && statementData && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Member Name</span>
                <span className="font-bold text-slate-900">{statementData.member?.fullName}</span>
                <span className="font-mono text-amber-800 font-bold block">[{statementData.member?.id}]</span>
              </div>
              <div>
                <span className="text-slate-500 block">Historical Membership Date</span>
                <span className="font-mono font-bold text-slate-900">{statementData.member?.membershipDate}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Savings Balance</span>
                <span className="font-mono font-bold text-slate-900">{formatNPR(statementData.totals?.currentSavingsBalance)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Active Loan Outstanding</span>
                <span className="font-mono font-bold text-rose-700">{formatNPR(statementData.totals?.currentLoanOutstanding)}</span>
              </div>
            </div>

            {/* Savings Transactions table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">Savings Account History</h4>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Receipt No</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono text-[11px]">
                  {statementData.savingsTx?.length === 0 ? (
                    <tr><td colSpan={5} className="py-4 text-center text-slate-400 font-sans">No savings transactions</td></tr>
                  ) : (
                    statementData.savingsTx?.map((t: any) => (
                      <tr key={t.id}>
                        <td className="py-1.5 px-3 font-sans text-slate-600">{t.date}</td>
                        <td className="py-1.5 px-3 font-bold text-slate-800">{t.receipt_no}</td>
                        <td className="py-1.5 px-3 font-sans">{t.type}</td>
                        <td className="py-1.5 px-3 font-bold text-slate-900">{formatNPR(t.amount)}</td>
                        <td className="py-1.5 px-3 text-slate-600">{formatNPR(t.balance_after)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Contributions table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">Monthly Contributions Record</h4>
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Payment Date</th>
                    <th className="py-2 px-3">Receipt No</th>
                    <th className="py-2 px-3">Period</th>
                    <th className="py-2 px-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono text-[11px]">
                  {statementData.contributions?.length === 0 ? (
                    <tr><td colSpan={4} className="py-4 text-center text-slate-400 font-sans">No contributions recorded</td></tr>
                  ) : (
                    statementData.contributions?.map((c: any) => (
                      <tr key={c.id}>
                        <td className="py-1.5 px-3 font-sans text-slate-600">{c.payment_date}</td>
                        <td className="py-1.5 px-3 font-bold text-slate-800">{c.receipt_no}</td>
                        <td className="py-1.5 px-3 font-sans">{c.month_name} {c.year_bs} B.S.</td>
                        <td className="py-1.5 px-3 font-bold text-slate-900">{formatNPR(c.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. MEMBERSHIP ROSTER REPORT */}
        {selectedReport === 'member-report' && (
          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-slate-100 font-bold">
              <tr>
                <th className="py-2 px-3">Member ID</th>
                <th className="py-2 px-3">Full Name</th>
                <th className="py-2 px-3">Historical Join Date</th>
                <th className="py-2 px-3">Mobile Phone</th>
                <th className="py-2 px-3">Address</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y text-[11px]">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="py-1.5 px-3 font-mono font-bold text-amber-800">{m.id}</td>
                  <td className="py-1.5 px-3 font-semibold text-slate-900">{m.full_name}</td>
                  <td className="py-1.5 px-3 font-mono text-slate-600">{m.membership_date}</td>
                  <td className="py-1.5 px-3 font-mono text-slate-600">{m.mobile_phone}</td>
                  <td className="py-1.5 px-3 text-slate-600">{m.address}</td>
                  <td className="py-1.5 px-3 text-slate-700">{m.membership_type}</td>
                  <td className="py-1.5 px-3 text-emerald-700 font-semibold">{m.membership_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Signatures Footer for Print/Export */}
        <div className="mt-12 pt-8 border-t border-slate-300 flex justify-between items-end text-xs">
          <div className="text-center">
            <div className="w-40 border-b border-slate-900 mb-1" />
            <span className="font-bold text-slate-900">Prepared By (Auditor)</span>
            <span className="block text-[10px] text-slate-500">Internal Accounts</span>
          </div>

          <div className="text-center">
            <div className="w-44 border-b border-slate-900 mb-1" />
            <span className="font-bold text-slate-900">{org.signatoryTitle || 'Authorized Signatory'}</span>
            <span className="block text-[10px] text-slate-500">Uddhyamsheel Group Executive Committee</span>
          </div>
        </div>
      </div>
    </div>
  );
};

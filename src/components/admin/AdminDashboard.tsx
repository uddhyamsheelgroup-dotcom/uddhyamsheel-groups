import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { OrgConfig } from '../../types/index.js';
import { StatCard } from '../common/StatCard.js';
import { formatNPR } from '../../utils/pdf.js';
import { LOGO_DATA_URI, STAMP_DATA_URI } from '../../assets/branding.js';
import {
  Users,
  UserCheck,
  PiggyBank,
  Coins,
  HandCoins,
  Percent,
  Wallet,
  Building,
  TrendingUp,
  ShieldCheck,
  Scale,
  Receipt,
  UserPlus,
  PlusCircle,
  Calculator,
  RefreshCw,
  Clock,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  ArrowDownLeft,
  Calendar
} from 'lucide-react';

interface AdminDashboardProps {
  org: OrgConfig;
  onNavigate: (tab: string) => void;
  onOpenCalculator: () => void;
  onViewReceipt: (receipt: any) => void;
  onOpenBrandKit?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  org,
  onNavigate,
  onOpenCalculator,
  onViewReceipt,
  onOpenBrandKit
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Loading Financial Overview...
          </span>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};
  const recentActivities = data?.recentActivities || [];

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
          {error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MOBILE-FIRST ADMIN LAYOUT (VISIBLE ON MOBILE & TABLET: block lg:hidden) */}
      {/* ========================================================================= */}
      <div className="block lg:hidden space-y-5">
        {/* Mobile Header Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 font-serif">
              {getGreeting()}, Admin
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-600" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </p>
          </div>
          <button
            onClick={fetchSummary}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors shadow-2xs min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            aria-label="Refresh financial metrics"
          >
            <RefreshCw className="w-4 h-4 text-cyan-700" />
          </button>
        </div>

        {/* Section Title: Financial Overview */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Financial Overview
            </h2>
            <span className="text-[11px] text-cyan-700 font-medium">Real Database Figures</span>
          </div>

          {/* Compact 2-Column Mobile Financial Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Members */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Members</span>
                <Users className="w-4 h-4 text-blue-700 shrink-0" />
              </div>
              <div>
                <div className="text-xl font-bold font-mono text-slate-900">
                  {s.activeMembers || 0}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {s.totalMembers || 0} Registered Total
                </div>
              </div>
            </div>

            {/* 2. Total Savings */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Savings</span>
                <PiggyBank className="w-4 h-4 text-cyan-700 shrink-0" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold font-mono text-slate-950 truncate">
                  {formatNPR(s.totalSavings || 0)}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  Member Balances
                </div>
              </div>
            </div>

            {/* 3. Outstanding Loans */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Outstanding</span>
                <HandCoins className="w-4 h-4 text-rose-700 shrink-0" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold font-mono text-rose-700 truncate">
                  {formatNPR(s.outstandingLoans || 0)}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {s.activeLoansCount || 0} Active Loans
                </div>
              </div>
            </div>

            {/* 4. Total Collections */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Collections</span>
                <Coins className="w-4 h-4 text-amber-700 shrink-0" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-bold font-mono text-amber-800 truncate">
                  {formatNPR(s.totalCollections || 0)}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  Cumulative Deposits
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Mobile Quick Actions */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono mb-2.5">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onNavigate('members')}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-left shadow-2xs flex items-center gap-2.5 transition-colors min-h-[48px] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">New Member</div>
                <div className="text-[10px] text-slate-500 truncate">Enroll record</div>
              </div>
            </button>

            <button
              onClick={() => onNavigate('collections')}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-left shadow-2xs flex items-center gap-2.5 transition-colors min-h-[48px] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Record Payment</div>
                <div className="text-[10px] text-slate-500 truncate">Dues & savings</div>
              </div>
            </button>

            <button
              onClick={() => onNavigate('loans')}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-left shadow-2xs flex items-center gap-2.5 transition-colors min-h-[48px] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                <HandCoins className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">New Loan</div>
                <div className="text-[10px] text-slate-500 truncate">Credit facility</div>
              </div>
            </button>

            <button
              onClick={onOpenCalculator}
              className="p-3 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl text-left shadow-2xs flex items-center gap-2.5 transition-colors min-h-[48px] cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">Loan Calculator</div>
                <div className="text-[10px] text-slate-500 truncate">EMI simulator</div>
              </div>
            </button>
          </div>
        </div>

        {/* Section: Mobile Recent Transactions List */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              Recent Transactions
            </h2>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs text-blue-700 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {recentActivities.length > 0 ? (
              recentActivities.slice(0, 8).map((act: any) => (
                <div
                  key={act.id}
                  className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-slate-900 truncate">{act.member_name}</span>
                      {act.member_id && (
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">[{act.member_id}]</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                      <span className="text-cyan-700 font-medium">{act.type}</span>
                      <span>·</span>
                      <span>{act.date}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {formatNPR(act.amount)}
                    </div>
                    <button
                      onClick={() =>
                        onViewReceipt({
                          receiptNo: act.receipt_no,
                          date: act.date,
                          memberId: act.member_id || 'N/A',
                          memberName: act.member_name,
                          category: act.category,
                          amount: act.amount,
                          paymentMethod: 'CASH',
                          description: act.type
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
                <p className="text-[11px] text-slate-400 mt-0.5">Financial activities will appear here in real-time.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP FINANCIAL OPERATIONS CONSOLE (VISIBLE ON DESKTOP: hidden lg:block) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block space-y-6">
        {/* Desktop Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">
              Executive Financial Management Console
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live double-entry cooperative balance sheet & operations oversight for {org.name || 'Uddhyamsheel Group'}
            </p>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('members')}
              className="px-3.5 py-2 bg-gradient-to-r from-[#002984] to-[#005a9e] hover:from-[#001f66] hover:to-[#004a82] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/15 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-cyan-300" />
              <span>New Member</span>
            </button>
            <button
              onClick={() => onNavigate('collections')}
              className="px-3.5 py-2 bg-white hover:bg-sky-50 text-slate-800 border border-sky-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-blue-700" />
              <span>Record Payment</span>
            </button>
            <button
              onClick={() => onNavigate('loans')}
              className="px-3.5 py-2 bg-white hover:bg-sky-50 text-slate-800 border border-sky-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <HandCoins className="w-3.5 h-3.5 text-amber-700" />
              <span>New Loan</span>
            </button>
            <button
              onClick={onOpenCalculator}
              className="px-3.5 py-2 bg-white hover:bg-sky-50 text-slate-800 border border-sky-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-cyan-600" />
              <span>Loan Calculator</span>
            </button>
            <button
              onClick={fetchSummary}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-sky-50 rounded-xl border border-sky-100 transition-colors cursor-pointer"
              title="Refresh Metrics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Executive Brand Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#01142B] via-[#022859] to-[#005a9e] border border-cyan-400/40 p-5 text-white shadow-xl">
          <div className="relative z-10 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-2xl bg-white p-1.5 shadow-2xl flex items-center justify-center ring-2 ring-cyan-300 shrink-0">
                <img src={LOGO_DATA_URI} alt="UG Logo" className="w-full h-full object-contain drop-shadow-xs" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black tracking-widest text-cyan-300 uppercase">
                    Cooperative Financial Operations
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs font-bold text-amber-400 font-mono bg-sky-950/80 px-2 py-0.5 rounded-full border border-amber-400/30">
                    {org.establishedBS || 'Estd. 2079 B.S.'}
                  </span>
                  <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Real Double-Entry Ledger</span>
                  </span>
                </div>
                <h2 className="text-xl font-black font-serif text-white tracking-wide">
                  {org.name || 'UDDHYAMSHEEL GROUP'}
                </h2>
                <p className="text-xs text-cyan-100/90 mt-0.5">
                  {org.address || 'Lumbini, Nepal'} · {org.phone} · {org.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onOpenBrandKit && (
                <button
                  onClick={onOpenBrandKit}
                  className="px-3.5 py-2 bg-sky-950/90 hover:bg-sky-900 border border-cyan-400/50 rounded-xl text-xs font-bold text-cyan-300 flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Official Seal & Branding</span>
                </button>
              )}
              <div className="w-14 h-14 rounded-full bg-white p-1 ring-2 ring-amber-400 shadow-md shrink-0 flex items-center justify-center">
                <img src={STAMP_DATA_URI} alt="Stamp" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Top 12 Financial & Cooperative Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Members"
            value={s.activeMembers || 0}
            subtext={`${s.totalMembers || 0} total enrolled`}
            icon={Users}
            trend="Active Status"
            accentColor="navy"
            onClick={() => onNavigate('members')}
          />
          <StatCard
            label="Total Member Savings"
            value={formatNPR(s.totalSavings || 0)}
            subtext="Available member liquidity"
            icon={PiggyBank}
            trend="Liquid Liabilities"
            accentColor="cyan"
            onClick={() => onNavigate('savings')}
          />
          <StatCard
            label="Outstanding Loans"
            value={formatNPR(s.outstandingLoans || 0)}
            subtext={`${s.activeLoansCount || 0} active credit accounts`}
            icon={HandCoins}
            trend="Loan Portfolio"
            accentColor="rose"
            onClick={() => onNavigate('loans')}
          />
          <StatCard
            label="Total Collections"
            value={formatNPR(s.totalCollections || 0)}
            subtext="Savings & contributions"
            icon={Coins}
            trend="Cumulative Inflow"
            accentColor="gold"
            onClick={() => onNavigate('collections')}
          />
          <StatCard
            label="Monthly Contributions"
            value={formatNPR(s.totalContributions || 0)}
            subtext="Solidarity share capital"
            icon={Scale}
            trend="Cooperative Capital"
            accentColor="emerald"
            onClick={() => onNavigate('collections')}
          />
          <StatCard
            label="Total Loan Interest"
            value={formatNPR(s.totalLoanInterest || 0)}
            subtext="Accumulated profit pool"
            icon={Percent}
            trend="Operating Income"
            accentColor="gold"
            onClick={() => onNavigate('loans')}
          />
          <StatCard
            label="Cash in Vault"
            value={formatNPR(s.cashBalance || 0)}
            subtext="Physical physical cash drawer"
            icon={Wallet}
            trend="Petty Cash"
            accentColor="cyan"
            onClick={() => onNavigate('cash-bank')}
          />
          <StatCard
            label="Bank Balance"
            value={formatNPR(s.bankBalance || 0)}
            subtext="Commercial bank accounts"
            icon={Building}
            trend="Institutional Float"
            accentColor="navy"
            onClick={() => onNavigate('cash-bank')}
          />
          <StatCard
            label="Total Assets"
            value={formatNPR(s.totalAssets || 0)}
            subtext="Balance sheet capital"
            icon={Building}
            trend="Total Capital"
            accentColor="navy"
            onClick={() => onNavigate('assets-liabilities')}
          />
          <StatCard
            label="Total Liabilities"
            value={formatNPR(s.totalLiabilities || 0)}
            subtext="Savings & accounts payable"
            icon={Scale}
            trend="Obligations"
            accentColor="rose"
            onClick={() => onNavigate('assets-liabilities')}
          />
          <StatCard
            label="External Investments"
            value={formatNPR(s.totalInvestments || 0)}
            subtext="Fixed deposits & securities"
            icon={TrendingUp}
            trend="Treasury Yield"
            accentColor="emerald"
            onClick={() => onNavigate('investments')}
          />
          <StatCard
            label="Reserve & Welfare Fund"
            value={formatNPR(s.reserveFund || 0)}
            subtext="Emergency stability fund"
            icon={ShieldCheck}
            trend="Statutory Reserve"
            accentColor="gold"
            onClick={() => onNavigate('assets-liabilities')}
          />
        </div>

        {/* Analytics & Ledger Stream */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left 2 Cols: Capital Adequacy & Flow */}
          <div className="col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Cooperative Financial Health & Capital Adequacy</h2>
                <p className="text-xs text-slate-500">Key prudential indicators calculated directly from authoritative ledger</p>
              </div>
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs text-blue-700 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Ledger</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">Liquid Cash-to-Savings</span>
                <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                  {s.totalSavings > 0 ? (((s.cashBalance + s.bankBalance) / s.totalSavings) * 100).toFixed(1) + '%' : '100%'}
                </div>
                <span className="text-[10px] text-slate-400">Prudential buffer</span>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">Loan-to-Deposit Ratio</span>
                <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                  {s.totalSavings > 0 ? ((s.outstandingLoans / s.totalSavings) * 100).toFixed(1) + '%' : '0.0%'}
                </div>
                <span className="text-[10px] text-slate-400">Deployed capital</span>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500 block">Distributable Profit Pool</span>
                <div className="text-lg font-bold font-mono text-amber-700 mt-1">
                  {formatNPR(s.totalLoanInterest || 0)}
                </div>
                <span className="text-[10px] text-slate-400">Equal member dividend</span>
              </div>
            </div>

            {/* Monthly contributions breakdown */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Monthly Contribution Flow</h3>
              {data?.contributionsByMonth && data.contributionsByMonth.length > 0 ? (
                <div className="space-y-2">
                  {data.contributionsByMonth.map((cm: any) => (
                    <div key={cm.month_bs} className="flex items-center text-xs">
                      <span className="w-24 text-slate-600 font-medium">{cm.month_name}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden mx-3">
                        <div
                          className="bg-amber-500 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(10, (cm.total / (s.totalContributions || 1)) * 100))}%`
                          }}
                        />
                      </div>
                      <span className="w-24 text-right font-mono font-semibold text-slate-900">
                        {formatNPR(cm.total)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <Coins className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-600 font-medium">No monthly contributions recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Record periodic dues in Monthly Collections.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right 1 Col: Recent Real Financial Transactions */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
                <p className="text-xs text-slate-500">Live transaction stream</p>
              </div>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2">
              {recentActivities.length > 0 ? (
                recentActivities.map((act: any) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 truncate">{act.member_name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                        <span>{act.type}</span>
                        <span>·</span>
                        <span className="font-mono text-slate-400">{act.receipt_no}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-slate-900">{formatNPR(act.amount)}</div>
                      <button
                        onClick={() =>
                          onViewReceipt({
                            receiptNo: act.receipt_no,
                            date: act.date,
                            memberId: act.member_id || 'N/A',
                            memberName: act.member_name,
                            category: act.category,
                            amount: act.amount,
                            paymentMethod: 'CASH',
                            description: act.type
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
                <div className="h-full flex flex-col items-center justify-center py-10 text-center text-slate-400">
                  <Receipt className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-medium text-slate-600">No transactions recorded yet</p>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mt-1">
                    Recorded member deposits, repayments, and fees will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

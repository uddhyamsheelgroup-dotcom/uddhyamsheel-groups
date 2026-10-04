import React, { useState, useEffect } from 'react';
import { api } from './api/client.js';
import { UserSession, OrgConfig, Certificate, Member } from './types/index.js';
import { DEFAULT_ORG_CONFIG } from './assets/branding.js';

import { LoginView } from './components/auth/LoginView.js';
import { Header } from './components/common/Header.js';
import { Sidebar } from './components/common/Sidebar.js';
import { ReceiptModal } from './components/common/ReceiptModal.js';
import { CertificateModal } from './components/common/CertificateModal.js';
import { LoanCalculatorModal } from './components/common/LoanCalculatorModal.js';
import { BrandIdentityModal } from './components/common/BrandIdentityModal.js';

// Admin Views
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import { MemberManagement } from './components/admin/MemberManagement.js';
import { MonthlyCollections } from './components/admin/MonthlyCollections.js';
import { SavingsManagement } from './components/admin/SavingsManagement.js';
import { LoanManagement } from './components/admin/LoanManagement.js';
import { AccountingViews } from './components/admin/AccountingViews.js';
import { ReportsView } from './components/admin/ReportsView.js';
import { CertificatesAndDocuments } from './components/admin/CertificatesAndDocuments.js';
import { SecurityAndSettings } from './components/admin/SecurityAndSettings.js';

// Member Portal View
import { MemberPortal } from './components/member/MemberPortal.js';
import { RefreshCw, LayoutDashboard, Users, Coins, HandCoins, Menu } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [org, setOrg] = useState<OrgConfig>(DEFAULT_ORG_CONFIG);
  const [financialRules, setFinancialRules] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Global Modals
  const [viewingReceipt, setViewingReceipt] = useState<any>(null);
  const [viewingCertificate, setViewingCertificate] = useState<{ cert: Certificate; member: Member } | null>(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [brandKitOpen, setBrandKitOpen] = useState(false);
  const [reportMemberId, setReportMemberId] = useState<string | undefined>(undefined);

  // Initialize session & system settings
  useEffect(() => {
    async function init() {
      try {
        const [meRes, settingsRes] = await Promise.all([
          api.getCurrentUser().catch(() => null),
          api.getSettings().catch(() => null)
        ]);

        if (meRes?.user) {
          setUser(meRes.user);
        }
        if (settingsRes?.orgConfig) {
          setOrg(settingsRes.orgConfig);
        }
        if (settingsRes?.financialRules) {
          setFinancialRules(settingsRes.financialRules);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setActiveTab('dashboard');
    }
  };

  const handleViewStatementFromMember = (memberId: string) => {
    setReportMemberId(memberId);
    setActiveTab('reports');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <h2 className="text-lg font-serif font-bold text-amber-400">UDDHYAMSHEEL GROUP</h2>
        <p className="text-xs text-slate-400 mt-1">Starting Authoritative Financial Management System...</p>
      </div>
    );
  }

  // Not signed in -> show login screen
  if (!user) {
    return (
      <LoginView
        org={org}
        onLoginSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Official Header */}
      <Header
        user={user}
        org={org}
        onLogout={handleLogout}
        activeTab={activeTab}
        onToggleMobileMenu={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onOpenBrandKit={() => setBrandKitOpen(true)}
        onProfileClick={() => {
          if (user.role === 'MEMBER') setActiveTab('profile');
          else setActiveTab('settings');
        }}
        onNotificationsClick={() => {
          if (user.role === 'ADMIN') setActiveTab('notifications');
          else setActiveTab('notifications');
        }}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          role={user.role}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setMobileSidebarOpen(false);
          }}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          onOpenCalculator={() => setCalculatorOpen(true)}
        />

        {/* Main Content Area with bottom padding for mobile navigation */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
          {/* ================= ADMIN VIEWS ================= */}
          {user.role === 'ADMIN' && (
            <>
              {activeTab === 'dashboard' && (
                <AdminDashboard
                  org={org}
                  onNavigate={setActiveTab}
                  onOpenCalculator={() => setCalculatorOpen(true)}
                  onViewReceipt={setViewingReceipt}
                  onOpenBrandKit={() => setBrandKitOpen(true)}
                />
              )}

              {activeTab === 'members' && (
                <MemberManagement
                  org={org}
                  onViewCertificate={(cert, member) => setViewingCertificate({ cert, member })}
                  onViewStatement={handleViewStatementFromMember}
                />
              )}

              {activeTab === 'collections' && (
                <MonthlyCollections
                  org={org}
                  financialRules={financialRules}
                  onViewReceipt={setViewingReceipt}
                />
              )}

              {activeTab === 'savings' && (
                <SavingsManagement
                  org={org}
                  onViewReceipt={setViewingReceipt}
                />
              )}

              {(activeTab === 'loans' || activeTab === 'profit-sharing') && (
                <LoanManagement
                  org={org}
                  financialRules={financialRules}
                  onOpenCalculator={() => setCalculatorOpen(true)}
                  onViewReceipt={setViewingReceipt}
                />
              )}

              {activeTab === 'cash-bank' && (
                <AccountingViews initialSubTab="cash-bank" org={org} />
              )}

              {activeTab === 'ledger' && (
                <AccountingViews initialSubTab="ledger" org={org} />
              )}

              {activeTab === 'investments' && (
                <AccountingViews initialSubTab="investments" org={org} />
              )}

              {activeTab === 'assets-liabilities' && (
                <AccountingViews initialSubTab="assets-liabilities" org={org} />
              )}

              {activeTab === 'reports' && (
                <ReportsView org={org} initialMemberId={reportMemberId} />
              )}

              {activeTab === 'certificates' && (
                <CertificatesAndDocuments
                  initialTab="certificates"
                  org={org}
                  onViewCertificate={(cert, member) => setViewingCertificate({ cert, member })}
                />
              )}

              {activeTab === 'documents' && (
                <CertificatesAndDocuments
                  initialTab="documents"
                  org={org}
                  onViewCertificate={(cert, member) => setViewingCertificate({ cert, member })}
                />
              )}

              {activeTab === 'notifications' && (
                <SecurityAndSettings initialTab="notifications" org={org} onUpdateOrg={setOrg} />
              )}

              {activeTab === 'audit-logs' && (
                <SecurityAndSettings initialTab="audit-logs" org={org} onUpdateOrg={setOrg} />
              )}

              {activeTab === 'settings' && (
                <SecurityAndSettings initialTab="settings" org={org} onUpdateOrg={setOrg} />
              )}
            </>
          )}

          {/* ================= MEMBER PORTAL ================= */}
          {user.role === 'MEMBER' && (
            <MemberPortal
              user={user}
              org={org}
              onViewReceipt={setViewingReceipt}
              onViewCertificate={(cert, member) => setViewingCertificate({ cert, member })}
              activeNavTab={activeTab}
              onNavTabChange={setActiveTab}
              onOpenBrandKit={() => setBrandKitOpen(true)}
            />
          )}
        </main>
      </div>

      {/* ================= ADMIN MOBILE BOTTOM NAVIGATION ================= */}
      {user.role === 'ADMIN' && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#011833]/95 backdrop-blur-md border-t border-sky-900/60 pb-safe lg:hidden shadow-2xl"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.25rem)' }}
          aria-label="Admin Mobile Navigation"
        >
          <div className="grid grid-cols-5 items-center h-16 px-1">
            {/* 1. Home (Dashboard) */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
                activeTab === 'dashboard' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Admin Dashboard"
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-1 leading-none">Home</span>
            </button>

            {/* 2. Members */}
            <button
              onClick={() => setActiveTab('members')}
              className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
                activeTab === 'members' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Members Directory"
            >
              <Users className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-1 leading-none">Members</span>
            </button>

            {/* 3. Payments / Collections */}
            <button
              onClick={() => setActiveTab('collections')}
              className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
                activeTab === 'collections' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Monthly Collections"
            >
              <Coins className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-1 leading-none">Collections</span>
            </button>

            {/* 4. Loans */}
            <button
              onClick={() => setActiveTab('loans')}
              className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
                activeTab === 'loans' || activeTab === 'profit-sharing' ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="Loans and Repayments"
            >
              <HandCoins className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-1 leading-none">Loans</span>
            </button>

            {/* 5. More */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] cursor-pointer ${
                !['dashboard', 'members', 'collections', 'loans', 'profit-sharing'].includes(activeTab)
                  ? 'text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label="More admin sections (open full drawer)"
            >
              <Menu className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-1 leading-none">More</span>
            </button>
          </div>
        </nav>
      )}

      {/* Global Modals */}
      <ReceiptModal
        receipt={viewingReceipt}
        org={org}
        onClose={() => setViewingReceipt(null)}
      />

      <CertificateModal
        certificate={viewingCertificate?.cert || null}
        member={viewingCertificate?.member || null}
        org={org}
        onClose={() => setViewingCertificate(null)}
      />

      <LoanCalculatorModal
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        defaultRate={financialRules?.annualLoanInterestRate || 12.0}
      />

      <BrandIdentityModal
        isOpen={brandKitOpen}
        onClose={() => setBrandKitOpen(false)}
        org={org}
      />
    </div>
  );
}

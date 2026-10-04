import React from 'react';
import { UserRole } from '../../types/index.js';
import { LOGO_DATA_URI } from '../../assets/branding.js';
import {
  LayoutDashboard,
  Users,
  Coins,
  PiggyBank,
  HandCoins,
  Wallet,
  BookOpenText,
  TrendingUp,
  Building2,
  FileSpreadsheet,
  FileCheck2,
  FolderOpen,
  Bell,
  History,
  Settings,
  Calculator,
  UserCheck,
  X,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenCalculator?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  onOpenCalculator
}) => {
  const adminSections = [
    {
      title: 'Operations',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'members', label: 'Members', icon: Users },
        { id: 'collections', label: 'Monthly Collections', icon: Coins },
        { id: 'savings', label: 'Savings Management', icon: PiggyBank },
        { id: 'loans', label: 'Loans & Repayments', icon: HandCoins },
        { id: 'profit-sharing', label: 'Profit / Interest Sharing', icon: UserCheck },
      ]
    },
    {
      title: 'Accounting & Ledger',
      items: [
        { id: 'cash-bank', label: 'Cash & Bank', icon: Wallet },
        { id: 'ledger', label: 'General Ledger', icon: BookOpenText },
        { id: 'investments', label: 'Investments', icon: TrendingUp },
        { id: 'assets-liabilities', label: 'Assets & Liabilities', icon: Building2 },
      ]
    },
    {
      title: 'Reports & Governance',
      items: [
        { id: 'reports', label: 'Financial Reports', icon: FileSpreadsheet },
        { id: 'certificates', label: 'Certificates', icon: FileCheck2 },
        { id: 'documents', label: 'Document Vault', icon: FolderOpen },
      ]
    },
    {
      title: 'Administration',
      items: [
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'audit-logs', label: 'Audit Logs', icon: History },
        { id: 'settings', label: 'System Settings', icon: Settings },
      ]
    }
  ];

  const memberSections = [
    {
      title: 'Personal Overview',
      items: [
        { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
        { id: 'profile', label: 'My Profile', icon: Users },
      ]
    },
    {
      title: 'My Accounts',
      items: [
        { id: 'savings', label: 'My Savings', icon: PiggyBank },
        { id: 'contributions', label: 'My Contributions', icon: Coins },
        { id: 'loans', label: 'My Loans & EMI', icon: HandCoins },
        { id: 'statements', label: 'My Statements', icon: FileSpreadsheet },
      ]
    },
    {
      title: 'Credentials & Security',
      items: [
        { id: 'certificates', label: 'My Certificates', icon: FileCheck2 },
        { id: 'documents', label: 'My Documents', icon: FolderOpen },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'settings', label: 'Security & PIN', icon: Settings },
      ]
    }
  ];

  const sections = role === 'ADMIN' ? adminSections : memberSections;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Drawer Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-[#011833] border-r border-sky-900/60 flex flex-col transition-transform duration-200 ease-in-out lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:z-20 lg:w-64 lg:shrink-0 lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-label="Sidebar Navigation"
      >
        {/* Mobile Drawer Top Brand Bar */}
        <div className="flex items-center justify-between p-4 border-b border-sky-900/60 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-1 shadow-sm ring-1 ring-cyan-400/60 shrink-0 flex items-center justify-center">
              <img src={LOGO_DATA_URI} alt="UG" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-xs font-black tracking-tight text-white font-serif">UDDHYAMSHEEL</div>
              <div className="text-[10px] text-cyan-300 font-semibold uppercase tracking-wider">
                {role === 'ADMIN' ? 'Admin Portal' : 'Member Portal'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav Sections */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
          {sections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all text-left min-h-[44px] cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/20 via-sky-600/15 to-transparent text-cyan-300 border-l-3 border-cyan-400 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Utility: Loan Calculator shortcut */}
        {onOpenCalculator && (
          <div className="p-3 border-t border-sky-900/60 bg-[#011328]">
            <button
              onClick={() => {
                onOpenCalculator();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-900/70 to-cyan-950/70 hover:from-blue-800 hover:to-cyan-900 text-cyan-300 text-xs font-bold rounded-xl border border-cyan-500/30 transition-all shadow-xs min-h-[44px] cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-cyan-400" />
              <span>Loan Calculator</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

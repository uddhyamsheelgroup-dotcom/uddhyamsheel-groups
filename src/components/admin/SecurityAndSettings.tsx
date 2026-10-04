import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { OrgConfig, FinancialRules, AuditLog, NotificationItem, Member } from '../../types/index.js';
import {
  Settings,
  Shield,
  History,
  Bell,
  Database,
  Key,
  Save,
  CheckCircle,
  AlertCircle,
  Send,
  Lock,
  Server,
  FileCode,
  Copy,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

interface SecurityAndSettingsProps {
  initialTab?: 'settings' | 'audit-logs' | 'notifications';
  org: OrgConfig;
  onUpdateOrg: (newOrg: OrgConfig) => void;
}

export const SecurityAndSettings: React.FC<SecurityAndSettingsProps> = ({
  initialTab = 'settings',
  org,
  onUpdateOrg
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'audit-logs' | 'notifications'>(initialTab);

  // Settings form
  const [orgForm, setOrgForm] = useState<OrgConfig>(org);
  const [finForm, setFinForm] = useState<FinancialRules>({
    monthlyContributionAmount: 1000,
    annualLoanInterestRate: 12.0,
    monthlyLoanInterestRate: 1.0,
    loanInterestMethod: 'REDUCING_BALANCE',
    profitSharingMethod: 'EQUAL_SHARE',
    gracePeriodDays: 5,
    penaltyRatePercentage: 1.0
  });

  // Security Credentials form
  const [credForm, setCredForm] = useState({
    currentPin: '',
    newUsername: '',
    newPin: '',
    confirmPin: ''
  });

  // Audit Logs
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logFilter, setLogFilter] = useState({ action: 'ALL', entity: 'ALL', search: '' });

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    type: 'INFO' as 'INFO' | 'WARNING' | 'SUCCESS',
    recipientType: 'ALL',
    memberId: ''
  });
  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchTab = async () => {
    setLoading(true);
    setActionError(null);
    try {
      if (activeTab === 'settings') {
        const res = await api.getSettings();
        if (res.orgConfig) setOrgForm(res.orgConfig);
        if (res.financialRules) setFinForm(res.financialRules);
      } else if (activeTab === 'audit-logs') {
        const res = await api.getAuditLogs(logFilter);
        setLogs(res.logs || []);
      } else if (activeTab === 'notifications') {
        const [nRes, mRes] = await Promise.all([
          api.getNotifications(),
          api.getMembers({ status: 'ACTIVE' })
        ]);
        setNotifications(nRes.notifications || []);
        setMembers(mRes.members || []);
      }
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTab();
  }, [activeTab, logFilter.action, logFilter.entity]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.updateSettings({ orgConfig: orgForm, financialRules: finForm });
      onUpdateOrg(orgForm);
      setActionSuccess('Organization configuration and financial rules updated successfully!');
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleUpdateAdminSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!credForm.currentPin) {
      setActionError('Current administrator PIN is required to verify changes.');
      return;
    }
    if (credForm.newPin && credForm.newPin !== credForm.confirmPin) {
      setActionError('New PIN and Confirmation PIN do not match.');
      return;
    }

    try {
      await api.changeAdminCredentials(credForm.currentPin, credForm.newUsername || undefined, credForm.newPin || undefined);
      setActionSuccess('Administrator credentials updated successfully. Please use new credentials on next sign in.');
      setCredForm({ currentPin: '', newUsername: '', newPin: '', confirmPin: '' });
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleBroadcastNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.broadcastNotification(broadcastForm);
      setActionSuccess('Notification dispatched successfully!');
      setBroadcastForm({ title: '', message: '', type: 'INFO', recipientType: 'ALL', memberId: '' });
      fetchTab();
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
            Security, Governance & System Controls
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organization profile, financial interest parameters, administrator security, and immutable audit trails
          </p>
        </div>

        <div className="flex flex-wrap rounded-xl bg-slate-100 p-1 text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-2 rounded-lg transition-colors min-h-[38px] cursor-pointer ${
              activeTab === 'settings' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            System Settings
          </button>
          <button
            onClick={() => setActiveTab('audit-logs')}
            className={`px-3 py-2 rounded-lg transition-colors min-h-[38px] cursor-pointer ${
              activeTab === 'audit-logs' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-2 rounded-lg transition-colors min-h-[38px] cursor-pointer ${
              activeTab === 'notifications' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Broadcast Notifications
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
            ×
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          {actionError}
        </div>
      )}

      {/* ================= SYSTEM SETTINGS TAB ================= */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Org Profile Settings */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Settings className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Organization Branding & Constitution</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nepali Name</label>
                  <input
                    type="text"
                    value={orgForm.nepaliName}
                    onChange={(e) => setOrgForm({ ...orgForm, nepaliName: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Established Year (B.S.)</label>
                  <input
                    type="text"
                    value={orgForm.establishedBS}
                    onChange={(e) => setOrgForm({ ...orgForm, establishedBS: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={orgForm.phone}
                    onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={orgForm.email}
                    onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })}
                    className="w-full p-2 border rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Office Address</label>
                <input
                  type="text"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Authorized Signatory Title</label>
                <input
                  type="text"
                  value={orgForm.signatoryTitle}
                  onChange={(e) => setOrgForm({ ...orgForm, signatoryTitle: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2">Cooperative Financial Parameters</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Standard Monthly Contribution (Rs.)</label>
                    <input
                      type="number"
                      value={finForm.monthlyContributionAmount}
                      onChange={(e) => setFinForm({ ...finForm, monthlyContributionAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Default Loan Interest Rate (% p.a.)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={finForm.annualLoanInterestRate}
                      onChange={(e) => setFinForm({ ...finForm, annualLoanInterestRate: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save Organization & Financial Rules</span>
                </button>
              </div>
            </form>
          </div>

          {/* Admin Account Security & Supabase Deployment Card */}
          <div className="space-y-6">
            {/* Admin Security */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                <Key className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Administrator Credentials & PIN</h3>
              </div>

              <form onSubmit={handleUpdateAdminSecurity} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Administrator Username</label>
                  <input
                    type="text"
                    value={credForm.newUsername}
                    onChange={(e) => setCredForm({ ...credForm, newUsername: e.target.value })}
                    placeholder="Leave blank to keep current"
                    className="w-full p-2 border rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">New PIN / Password</label>
                    <input
                      type="password"
                      value={credForm.newPin}
                      onChange={(e) => setCredForm({ ...credForm, newPin: e.target.value })}
                      placeholder="••••••"
                      className="w-full p-2 border rounded-lg font-mono tracking-widest"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Confirm New PIN</label>
                    <input
                      type="password"
                      value={credForm.confirmPin}
                      onChange={(e) => setCredForm({ ...credForm, confirmPin: e.target.value })}
                      placeholder="••••••"
                      className="w-full p-2 border rounded-lg font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-lg">
                  <label className="block font-bold text-amber-900 mb-1">Current PIN * (Required to Authorize Changes)</label>
                  <input
                    type="password"
                    required
                    value={credForm.currentPin}
                    onChange={(e) => setCredForm({ ...credForm, currentPin: e.target.value })}
                    placeholder="Enter current PIN"
                    className="w-full p-2 border border-amber-300 rounded-lg font-mono tracking-widest bg-white"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Update Administrator PIN</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Production Database & Supabase PostgreSQL */}
            <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-3">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Authoritative Production Database Status</h3>
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Production Storage Engine:</span>
                  <span className="font-mono text-emerald-400 font-bold">Cloudflare D1 (Global Distributed SQL)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">D1 Binding:</span>
                  <span className="font-mono text-slate-300">DB (uddhyamsheel-db)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Browser LocalStorage Dependency:</span>
                  <span className="text-emerald-400 font-bold">ZERO (100% Server Authoritative)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Database Schema Migration:</span>
                  <span className="font-mono text-emerald-400">migrations/0001_initial_schema.sql</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  Target runtime: Cloudflare Workers with D1 binding <code className="text-emerald-400">DB</code> and Web Crypto API authentication.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= AUDIT LOGS TAB ================= */}
      {activeTab === 'audit-logs' && (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">
              Immutable System Audit Logs (All administrative operations are permanently recorded)
            </span>
            <button onClick={fetchTab} className="p-1.5 rounded bg-white border text-slate-600 hover:text-slate-900">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Entity ID</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      No audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-500 font-sans">{log.timestamp.replace('T', ' ').substring(0, 19)}</td>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-900">{log.user_name}</td>
                      <td className="py-2 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.role === 'ADMIN' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800'}`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">{log.action}</td>
                      <td className="py-2 px-3 text-slate-600">{log.entity}</td>
                      <td className="py-2 px-3 text-amber-800">{log.entity_id || '-'}</td>
                      <td className="py-2 px-3 font-sans text-slate-700 max-w-[260px] truncate">{log.description}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= NOTIFICATIONS BROADCAST TAB ================= */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dispatch Box */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              <span>Broadcast Notice</span>
            </h3>

            <form onSubmit={handleBroadcastNotification} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1">Recipient</label>
                <select
                  value={broadcastForm.recipientType}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, recipientType: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="ALL">All Cooperative Members</option>
                  <option value="MEMBER">Single Specific Member</option>
                </select>
              </div>

              {broadcastForm.recipientType === 'MEMBER' && (
                <div>
                  <label className="block font-semibold mb-1">Select Member</label>
                  <select
                    value={broadcastForm.memberId}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, memberId: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.id} - {m.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  placeholder="e.g. Annual General Meeting (AGM) Notice"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Notice Content *</label>
                <textarea
                  rows={4}
                  required
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  placeholder="Detailed announcement content..."
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-amber-400" />
                  <span>Send Notification</span>
                </button>
              </div>
            </form>
          </div>

          {/* List of Sent Notifications */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Notice History</h3>
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No announcements issued yet.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-900">{n.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{n.created_at.substring(0, 10)}</span>
                    </div>
                    <p className="text-slate-600">{n.message}</p>
                    <div className="mt-2 text-[10px] text-slate-400">
                      Target: <span className="font-semibold text-slate-700">{n.recipient_type}</span>
                      {n.member_id && <span className="font-mono text-amber-800 ml-1">[{n.member_id}]</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

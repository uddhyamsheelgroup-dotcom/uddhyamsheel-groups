import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Member, OrgConfig, Certificate } from '../../types/index.js';
import { formatNPR } from '../../utils/pdf.js';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  Archive,
  RotateCcw,
  Trash2,
  Key,
  Award,
  FileText,
  AlertTriangle,
  X,
  CheckCircle,
  RefreshCw,
  Phone,
  MapPin,
  Calendar,
  ShieldAlert
} from 'lucide-react';

interface MemberManagementProps {
  org: OrgConfig;
  onViewCertificate: (cert: Certificate, member: Member) => void;
  onViewStatement: (memberId: string) => void;
}

export const MemberManagement: React.FC<MemberManagementProps> = ({
  org,
  onViewCertificate,
  onViewStatement
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPinModal, setShowResetPinModal] = useState(false);

  // Selected Member
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberDetail, setMemberDetail] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    photoUrl: '',
    dob: '',
    gender: 'Male',
    citizenshipNo: '',
    address: 'Lumbini, Nepal',
    mobilePhone: '',
    email: '',
    emergencyName: '',
    emergencyPhone: '',
    membershipType: 'General Member',
    membershipDate: '2079-01-01', // Historical joining date
    initialPin: '1234',
    notes: ''
  });

  const [confirmIdInput, setConfirmIdInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.getMembers({ search, status: statusFilter, type: typeFilter });
      setMembers(res.members || []);
    } catch (err: any) {
      console.error('Fetch members error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [search, statusFilter, typeFilter]);

  const openAddModal = () => {
    setFormData({
      fullName: '',
      photoUrl: '',
      dob: '',
      gender: 'Male',
      citizenshipNo: '',
      address: 'Lumbini, Nepal',
      mobilePhone: '',
      email: '',
      emergencyName: '',
      emergencyPhone: '',
      membershipType: 'General Member',
      membershipDate: '2079-01-01',
      initialPin: '1234',
      notes: ''
    });
    setActionError(null);
    setShowAddModal(true);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);
    try {
      await api.createMember(formData);
      setActionSuccess(`Member registered successfully with historical joining date ${formData.membershipDate}! Certificate issued.`);
      setShowAddModal(false);
      fetchMembers();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create member.');
    } finally {
      setSubmitting(false);
    }
  };

  const openViewDetail = async (member: Member) => {
    setSelectedMember(member);
    setShowDetailModal(true);
    try {
      const details = await api.getMember(member.id);
      setMemberDetail(details);
    } catch (err: any) {
      console.error('Failed to get member details:', err);
    }
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setFormData({
      fullName: member.full_name,
      photoUrl: member.photo_url || '',
      dob: member.dob || '',
      gender: member.gender || 'Male',
      citizenshipNo: member.citizenship_no || '',
      address: member.address,
      mobilePhone: member.mobile_phone,
      email: member.email || '',
      emergencyName: member.emergency_name || '',
      emergencyPhone: member.emergency_phone || '',
      membershipType: member.membership_type,
      membershipDate: member.membership_date,
      initialPin: '',
      notes: member.notes || ''
    });
    setActionError(null);
    setShowEditModal(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.updateMember(selectedMember.id, formData);
      setActionSuccess(`Member ${selectedMember.id} updated successfully.`);
      setShowEditModal(false);
      fetchMembers();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update member.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveMember = async (member: Member) => {
    if (!confirm(`Are you sure you want to archive member ${member.full_name} (${member.id})?`)) return;
    try {
      await api.archiveMember(member.id);
      setActionSuccess(`Member ${member.id} has been archived.`);
      fetchMembers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRestoreMember = async (member: Member) => {
    try {
      await api.restoreMember(member.id);
      setActionSuccess(`Member ${member.id} has been restored to active status.`);
      fetchMembers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openDeleteModal = (member: Member) => {
    setSelectedMember(member);
    setConfirmIdInput('');
    setActionError(null);
    setShowDeleteModal(true);
  };

  const handlePermanentDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.permanentlyDeleteMember(selectedMember.id, confirmIdInput.trim());
      setActionSuccess(`Member ${selectedMember.id} has been permanently deleted.`);
      setShowDeleteModal(false);
      fetchMembers();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openResetPin = (member: Member) => {
    setSelectedMember(member);
    setNewPinInput('1234');
    setActionError(null);
    setShowResetPinModal(true);
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await api.resetMemberPin(selectedMember.id, newPinInput.trim());
      setActionSuccess(`PIN for member ${selectedMember.id} has been reset.`);
      setShowResetPinModal(false);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Add Member Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            Member Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Register, manage, archive, and audit members of {org.name || 'Uddhyamsheel Group'}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <UserPlus className="w-4 h-4 text-amber-400" />
          <span>Register New Member</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name, ID, Phone, or Citizenship..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({members.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'ACTIVE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'ARCHIVED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Archived
            </button>
          </div>

          <button
            onClick={fetchMembers}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Member ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Historical Join Date</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Savings Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Loading members database...</span>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No members found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {search ? 'Try adjusting your search criteria' : 'Click "Register New Member" to add the first cooperative member'}
                    </p>
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-800">
                      {m.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {m.full_name}
                      <span className="block text-[10px] text-slate-400 font-normal">{m.membership_type}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {m.membership_date}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {m.mobile_phone}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[150px] truncate">
                      {m.address}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {formatNPR(m.savings_balance || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        m.membership_status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          m.membership_status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`} />
                        {m.membership_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openViewDetail(m)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                          title="View Details & Statement"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(m)}
                          className="p-1.5 text-slate-600 hover:text-amber-700 hover:bg-slate-100 rounded"
                          title="Edit Member"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openResetPin(m)}
                          className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-slate-100 rounded"
                          title="Reset Member PIN"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        {m.membership_status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleArchiveMember(m)}
                            className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-slate-100 rounded"
                            title="Archive Member"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestoreMember(m)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded"
                            title="Restore Member"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openDeleteModal(m)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-slate-100 rounded"
                          title="Permanent Deletion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ================= REGISTER MEMBER MODAL ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Register Member (Uddhyamsheel Group)</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {actionError}
                </div>
              )}

              {/* Historical Membership Date Notice */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                <span className="font-bold">Historical Membership Date Rule: </span>
                Enter the original date when this member originally joined the cooperative (e.g. 2079 B.S. or historical date). It will never be overwritten with software creation date.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Full Name"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Historical Membership Date * (B.S. / A.D.)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.membershipDate}
                    onChange={(e) => setFormData({ ...formData, membershipDate: e.target.value })}
                    placeholder="e.g. 2079-05-15"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.mobilePhone}
                    onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                    placeholder="e.g. 98XXXXXXXX"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Permanent / Current Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full addresses"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Citizenship Certificate No.</label>
                  <input
                    type="text"
                    value={formData.citizenshipNo}
                    onChange={(e) => setFormData({ ...formData, citizenshipNo: e.target.value })}
                    placeholder="e.g. 38-01-78-XXXXX"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Membership Type</label>
                  <select
                    value={formData.membershipType}
                    onChange={(e) => setFormData({ ...formData, membershipType: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="General Member">General Member</option>
                    <option value="Founding Member">Founding Member</option>
                    <option value="Executive Board Member">Executive Board Member</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Member Portal PIN (6 Digits)</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={formData.initialPin}
                    onChange={(e) => setFormData({ ...formData, initialPin: e.target.value })}
                    placeholder="••••••"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono tracking-widest text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergencyName}
                    onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional records or remarks..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2"
                >
                  {submitting ? 'Registering...' : 'Register & Issue Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT MEMBER MODAL ================= */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Edit Member: {selectedMember.full_name} ({selectedMember.id})</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Historical Membership Date (Preserved)
                  </label>
                  <input
                    type="text"
                    value={formData.membershipDate}
                    onChange={(e) => setFormData({ ...formData, membershipDate: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    value={formData.mobilePhone}
                    onChange={(e) => setFormData({ ...formData, mobilePhone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Citizenship No.</label>
                  <input
                    type="text"
                    value={formData.citizenshipNo}
                    onChange={(e) => setFormData({ ...formData, citizenshipNo: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Membership Type</label>
                  <select
                    value={formData.membershipType}
                    onChange={(e) => setFormData({ ...formData, membershipType: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="General Member">General Member</option>
                    <option value="Founding Member">Founding Member</option>
                    <option value="Executive Board Member">Executive Board Member</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= VIEW MEMBER DETAIL & FINANCIAL SUMMARY ================= */}
      {showDetailModal && selectedMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-sm">Member File: {selectedMember.full_name}</h3>
                <span className="font-mono text-xs text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  {selectedMember.id}
                </span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Profile Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">Contact Phone</span>
                  <span className="font-mono font-bold text-slate-900">{selectedMember.mobile_phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Historical Membership Date</span>
                  <span className="font-mono font-bold text-slate-900">{selectedMember.membership_date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Address</span>
                  <span className="font-medium text-slate-900">{selectedMember.address}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Citizenship Number</span>
                  <span className="font-mono font-medium text-slate-900">{selectedMember.citizenship_no || 'Recorded on file'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Membership Type</span>
                  <span className="font-semibold text-amber-800">{selectedMember.membership_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Account Status</span>
                  <span className="font-semibold text-emerald-700">{selectedMember.account_status}</span>
                </div>
              </div>

              {/* Financial Summary Cards */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Live Financial Standing</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-100 rounded-lg p-3 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Current Savings Balance</span>
                    <span className="text-lg font-bold font-mono text-slate-900">
                      {formatNPR(memberDetail?.savingsAccount?.balance || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Account: {memberDetail?.savingsAccount?.account_number}</span>
                  </div>

                  <div className="bg-slate-100 rounded-lg p-3 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Total Contributions</span>
                    <span className="text-lg font-bold font-mono text-amber-700">
                      {formatNPR(memberDetail?.totalContributions || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Cumulative monthly dues</span>
                  </div>

                  <div className="bg-slate-100 rounded-lg p-3 border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Outstanding Loan Balance</span>
                    <span className="text-lg font-bold font-mono text-rose-700">
                      {formatNPR(memberDetail?.loanSummary?.total_outstanding || 0)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Principal remaining</span>
                  </div>
                </div>
              </div>

              {/* Issued Certificates */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Official Certificates</h4>
                {memberDetail?.certificates && memberDetail.certificates.length > 0 ? (
                  <div className="space-y-2">
                    {memberDetail.certificates.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-600" />
                          <div>
                            <div className="font-semibold text-slate-900">{c.title}</div>
                            <div className="text-[11px] text-slate-500">
                              Issued: {c.issue_date} · Cert No: <span className="font-mono text-amber-800">{c.certificate_no}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowDetailModal(false);
                            onViewCertificate(c, selectedMember);
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-xs border border-amber-200"
                        >
                          View / Print Certificate
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No certificates recorded.</p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  onViewStatement(selectedMember.id);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>View Full Member Statement</span>
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= RESET PIN MODAL ================= */}
      {showResetPinModal && selectedMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm">Reset PIN: {selectedMember.id}</h3>
              </div>
              <button onClick={() => setShowResetPinModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPin} className="p-6 space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {actionError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New 6-Digit Member PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="••••••"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono tracking-widest text-center font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPinModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold"
                >
                  {submitting ? 'Resetting...' : 'Reset PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PERMANENT DELETE SAFETY GUARD MODAL ================= */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-red-200">
            <div className="bg-red-950 px-6 py-4 flex items-center justify-between text-white border-b border-red-900">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-sm">Permanent Member Deletion Guard</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="p-1 text-slate-400 hover:text-white rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePermanentDelete} className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Strict Cooperative Audit Policy</span>
                </div>
                <p>
                  Members with any historical financial records (savings, contributions, active/historical loans, repayments, documents) CANNOT be deleted permanently.
                </p>
                <p>
                  If financial records exist, you must use <strong>ARCHIVE</strong> instead to maintain compliance with cooperative regulations.
                </p>
              </div>

              {actionError && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-xs text-red-900 font-medium">
                  {actionError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type <span className="font-mono text-red-700 font-bold">{selectedMember.id}</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={confirmIdInput}
                  onChange={(e) => setConfirmIdInput(e.target.value)}
                  placeholder={`Type "${selectedMember.id}"`}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-1 focus:ring-red-500 font-mono uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || confirmIdInput.trim() !== selectedMember.id}
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 disabled:opacity-40 text-white rounded text-xs font-semibold"
                >
                  {submitting ? 'Checking records...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

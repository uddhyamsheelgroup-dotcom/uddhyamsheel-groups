import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Certificate, MemberDocument, Member, OrgConfig } from '../../types/index.js';
import {
  Award,
  FolderOpen,
  FileCheck2,
  Download,
  Printer,
  Upload,
  Search,
  Filter,
  Eye,
  FileText,
  X,
  CheckCircle,
  PlusCircle
} from 'lucide-react';

interface CertificatesAndDocumentsProps {
  initialTab?: 'certificates' | 'documents';
  org: OrgConfig;
  onViewCertificate: (cert: Certificate, member: Member) => void;
}

export const CertificatesAndDocuments: React.FC<CertificatesAndDocumentsProps> = ({
  initialTab = 'certificates',
  org,
  onViewCertificate
}) => {
  const [activeTab, setActiveTab] = useState<'certificates' | 'documents'>(initialTab);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload Document Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    memberId: '',
    documentType: 'CITIZENSHIP',
    title: '',
    fileName: 'citizenship_front.pdf',
    fileUrl: 'data:application/pdf;base64,JVBERi0xLjQK...',
    fileSize: 102400,
    mimeType: 'application/pdf',
    notes: ''
  });

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [certRes, docRes, memRes] = await Promise.all([
        api.getCertificates(),
        api.getDocuments(),
        api.getMembers({ status: 'ACTIVE' })
      ]);
      setCertificates(certRes.certificates || []);
      setDocuments(docRes.documents || []);
      setMembers(memRes.members || []);
      if (memRes.members?.length > 0 && !uploadData.memberId) {
        setUploadData((prev) => ({ ...prev, memberId: memRes.members[0].id }));
      }
    } catch (err: any) {
      console.error('Fetch certs/docs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.memberId || !uploadData.title) {
      setActionError('Member and Document Title are required.');
      return;
    }

    try {
      await api.uploadDocument(uploadData);
      setActionSuccess(`Document "${uploadData.title}" archived into member file.`);
      setShowUploadModal(false);
      fetchData();
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
            Certificates & Official Records Vault
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Membership certificates, legal agreements, citizenship proofs, and identity records
          </p>
        </div>

        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'certificates' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Membership Certificates ({certificates.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'documents' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Document Vault ({documents.length})
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

      {/* ================= CERTIFICATES TAB ================= */}
      {activeTab === 'certificates' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-[#01142B] via-[#022859] to-[#005a9e] rounded-2xl p-5 text-white border border-cyan-400/40 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  Notarized Legal Certification
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-xs text-cyan-300 font-mono">Estd. 2079 B.S.</span>
              </div>
              <h3 className="text-lg font-serif font-bold text-white">
                Uddhyamsheel Membership Certification Registry
              </h3>
              <p className="text-xs text-cyan-100/80 mt-0.5">
                Every certificate is cryptographically serialized, stamped with the official Gajalakshmi bank ink seal, and embossed with the 36-point notary gold foil medallion.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <span className="text-xs font-bold text-amber-300 bg-amber-950/80 px-3 py-1.5 rounded-xl border border-amber-400/40 shadow-xs">
                {certificates.length} Total Issued Certificates
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Certificate No</th>
                  <th className="py-3 px-4">Member ID</th>
                  <th className="py-3 px-4">Member Full Name</th>
                  <th className="py-3 px-4">Historical Membership Date</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">View / Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No certificates issued yet</p>
                      <p className="text-[11px] text-slate-400 mt-1">Official certificates are automatically generated when registering members.</p>
                    </td>
                  </tr>
                ) : (
                  certificates.map((c) => {
                    const member = members.find((m) => m.id === c.member_id) || {
                      id: c.member_id,
                      full_name: c.member_name || c.member_id,
                      address: c.member_address || 'Lumbini, Nepal',
                      membership_date: c.historical_membership_date,
                      membership_type: 'General Member',
                      citizenship_no: c.citizenship_no
                    } as Member;

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.certificate_no}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-amber-800">{c.member_id}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{c.member_name || member.full_name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{c.historical_membership_date}</td>
                        <td className="py-3 px-4 text-slate-600">{c.issue_date}</td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-700 font-semibold text-[11px]">ISSUED</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onViewCertificate(c, member)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-xs border border-amber-200 inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>View Official Certificate</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {/* ================= DOCUMENTS TAB ================= */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900">Archived Member Documents</h3>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload Document</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Document ID</th>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Document Type</th>
                    <th className="py-2.5 px-3">Title</th>
                    <th className="py-2.5 px-3">Upload Date</th>
                    <th className="py-2.5 px-3">Archived By</th>
                    <th className="py-2.5 px-3 text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                        <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span>No member documents uploaded to vault yet.</span>
                      </td>
                    </tr>
                  ) : (
                    documents.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">{d.id}</td>
                        <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                          {d.member_name} <span className="font-mono text-amber-800">[{d.member_id}]</span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-600">{d.document_type}</td>
                        <td className="py-2 px-3 font-sans font-medium text-slate-800">{d.title}</td>
                        <td className="py-2 px-3 font-sans text-slate-500">{d.upload_date}</td>
                        <td className="py-2 px-3 font-sans text-slate-500">{d.uploaded_by}</td>
                        <td className="py-2 px-3 text-right font-sans">
                          <button
                            onClick={() => alert(`Document "${d.title}" is securely preserved in database.`)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[10px]"
                          >
                            Download
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
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Upload Official Document</h3>
            <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Target Member *</label>
                <select
                  value={uploadData.memberId}
                  onChange={(e) => setUploadData({ ...uploadData, memberId: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.id} - {m.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Document Type</label>
                <select
                  value={uploadData.documentType}
                  onChange={(e) => setUploadData({ ...uploadData, documentType: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="CITIZENSHIP">Citizenship Certificate</option>
                  <option value="MEMBERSHIP_APPLICATION">Membership Application</option>
                  <option value="LOAN_AGREEMENT">Loan Promissory Note / Agreement</option>
                  <option value="LAND_COLLATERAL">Collateral / Land Lalpurja</option>
                  <option value="IDENTITY_PROOF">Identity / Passport / Driving License</option>
                  <option value="OTHER">Other Official Document</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  placeholder="e.g. Scanned Citizenship Front & Back"
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">File Name</label>
                <input
                  type="text"
                  value={uploadData.fileName}
                  onChange={(e) => setUploadData({ ...uploadData, fileName: e.target.value })}
                  className="w-full p-2 border rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-3 py-1.5 bg-slate-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-slate-900 text-white rounded font-semibold">Archive Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

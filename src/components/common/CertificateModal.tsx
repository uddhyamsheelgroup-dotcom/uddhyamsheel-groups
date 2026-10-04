import React, { useState } from 'react';
import { Certificate, Member, OrgConfig } from '../../types/index.js';
import { generateCertificatePDF } from '../../utils/pdf.js';
import {
  STAMP_DATA_URI,
  LOGO_DATA_URI,
  GOLD_SEAL_DATA_URI
} from '../../assets/branding.js';
import {
  Printer,
  Download,
  X,
  Award,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  QrCode,
  Eye,
  FileCheck
} from 'lucide-react';

interface CertificateModalProps {
  certificate: Certificate | null;
  member: Member | null;
  org: OrgConfig;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, member, org, onClose }) => {
  const [themeMode, setThemeMode] = useState<'gold' | 'sapphire'>('gold');

  if (!certificate || !member) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateCertificatePDF(certificate, member, org);
  };

  const verificationHash = `UDG-${certificate.certificate_no.replace(/\s+/g, '')}-${member.id}-${(member.membership_date || '2079').substring(0, 4)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl border border-sky-300 flex flex-col max-h-[96vh]">
        {/* Modal Action Header */}
        <div className="bg-gradient-to-r from-[#01142B] via-[#022859] to-[#005a9e] px-4 sm:px-6 py-3.5 flex items-center justify-between text-white border-b border-cyan-400/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white p-1 shadow-sm ring-1 ring-cyan-300">
              <img src={LOGO_DATA_URI} alt="UG" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-wide font-serif">
                  Official Membership Certificate
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-400/40 font-mono">
                  {certificate.certificate_no}
                </span>
              </div>
              <p className="text-[11px] text-cyan-200/90 hidden sm:block">
                Legal proof of cooperative equity & group membership in Uddhyamsheel Group
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <div className="hidden md:flex items-center bg-slate-900/80 rounded-xl p-0.5 border border-sky-700/60 text-xs">
              <button
                onClick={() => setThemeMode('gold')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  themeMode === 'gold'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Royal Gold
              </button>
              <button
                onClick={() => setThemeMode('sapphire')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  themeMode === 'sapphire'
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Sapphire Blue
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-sky-700/60 cursor-pointer"
              title="Print Certificate"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              title="Download High-Resolution PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Scroll Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/60 flex justify-center items-start print:p-0 print:bg-white">
          {/* ================= PHYSICAL CERTIFICATE PAPER ================= */}
          <div
            id="printable-certificate"
            className={`w-[840px] min-w-[840px] shadow-2xl relative rounded-xs transition-all duration-300 print:shadow-none print:w-full print:min-w-0 ${
              themeMode === 'gold'
                ? 'bg-[#FDFBF7] text-slate-900 border-8 border-[#002984]'
                : 'bg-[#F8FAFC] text-slate-900 border-8 border-[#011B3B]'
            }`}
          >
            {/* Guilloché Geometric Outer Accent Frame */}
            <div className="p-4 sm:p-5 relative">
              {/* Gold / Metallic Double Border */}
              <div
                className={`p-6 sm:p-8 relative border-2 ${
                  themeMode === 'gold'
                    ? 'border-[#B8860B] bg-[radial-gradient(#F5E6C8_1px,transparent_1px)] [background-size:16px_16px]'
                    : 'border-[#0077B6] bg-[radial-gradient(#BAE6FD_1px,transparent_1px)] [background-size:16px_16px]'
                }`}
              >
                {/* 4 Corner Classical Ornate Fleurons */}
                <div className="absolute top-1 left-1 w-8 h-8 pointer-events-none">
                  <div className="w-full h-full border-t-4 border-l-4 border-[#002984] relative">
                    <div className="absolute top-1 left-1 w-3 h-3 bg-[#B8860B]" />
                  </div>
                </div>
                <div className="absolute top-1 right-1 w-8 h-8 pointer-events-none">
                  <div className="w-full h-full border-t-4 border-r-4 border-[#002984] relative">
                    <div className="absolute top-1 right-1 w-3 h-3 bg-[#B8860B]" />
                  </div>
                </div>
                <div className="absolute bottom-1 left-1 w-8 h-8 pointer-events-none">
                  <div className="w-full h-full border-b-4 border-l-4 border-[#002984] relative">
                    <div className="absolute bottom-1 left-1 w-3 h-3 bg-[#B8860B]" />
                  </div>
                </div>
                <div className="absolute bottom-1 right-1 w-8 h-8 pointer-events-none">
                  <div className="w-full h-full border-b-4 border-r-4 border-[#002984] relative">
                    <div className="absolute bottom-1 right-1 w-3 h-3 bg-[#B8860B]" />
                  </div>
                </div>

                {/* Ambient Center Watermark of the 3D UG Logo & Mahalakshmi */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.045] pointer-events-none select-none">
                  <div className="w-96 h-96">
                    <img src={LOGO_DATA_URI} alt="" className="w-full h-full object-contain" />
                  </div>
                </div>

                {/* ================= HEADER SECTION ================= */}
                <div className="relative z-10 flex items-center justify-between pb-4 border-b-2 border-slate-200">
                  {/* Left: 3D "UG" Logo in Gold Medallion Rim */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-white p-2 shadow-md border-2 border-[#B8860B] ring-2 ring-[#002984]/20 flex items-center justify-center">
                      <img src={LOGO_DATA_URI} alt="UG Logo" className="w-full h-full object-contain drop-shadow-xs" />
                    </div>
                  </div>

                  {/* Center: Authoritative Organization Heading */}
                  <div className="text-center flex-1 px-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-900/10 text-[#002984] text-[10.5px] font-black uppercase tracking-widest mb-1">
                      <ShieldCheck className="w-3 h-3 text-[#002984]" />
                      <span>Cooperative Group Registration · Lumbini Charter</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#002984] tracking-wider uppercase">
                      {org.name || 'UDDHYAMSHEEL GROUP'}
                    </h1>
                    <div className="text-base font-extrabold text-blue-900 tracking-wide mt-0.5">
                      {org.nepaliName || 'उद्यमशील समूह'}
                    </div>
                    <div className="text-xs text-slate-600 font-medium flex items-center justify-center gap-2 mt-1">
                      <span>{org.address || 'Lumbini, Nepal'}</span>
                      <span>·</span>
                      <span>Established: <strong className="text-slate-900 font-mono">{org.establishedBS || '2079 B.S.'}</strong> ({org.establishedAD || '2023 A.D.'})</span>
                      <span>·</span>
                      <span className="font-mono">{org.phone}</span>
                    </div>
                  </div>

                  {/* Right: Live Mahalakshmi Seal Badge */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-20 h-20 rounded-full bg-white p-1 shadow-md border-2 border-[#002984] ring-2 ring-[#B8860B]/40 flex items-center justify-center">
                      <img src={STAMP_DATA_URI} alt="Gajalakshmi Stamp" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>

                {/* Decorative Central Title Ribbon */}
                <div className="text-center my-6 relative z-10">
                  <div className="inline-block relative">
                    <div className="bg-gradient-to-r from-[#002984] via-[#005a9e] to-[#002984] text-white px-8 py-2 rounded-sm shadow-md border-y-2 border-[#ffe066]">
                      <h2 className="text-lg sm:text-xl font-serif font-black tracking-widest uppercase">
                        Certificate of Cooperative Membership
                      </h2>
                    </div>
                    <div className="text-[11px] font-bold text-[#B8860B] uppercase tracking-widest mt-1.5 font-serif">
                      सदस्यताको आधिकारिक प्रमाणपत्र
                    </div>
                  </div>
                  <p className="text-xs italic text-slate-600 mt-2 font-serif">
                    This is to officially and solemnly certify that
                  </p>
                </div>

                {/* ================= MEMBER NAME DISPLAY ================= */}
                <div className="text-center my-5 relative z-10">
                  <div className="text-3xl sm:text-4xl font-serif font-extrabold text-[#002984] tracking-wide py-1">
                    {member.full_name}
                  </div>

                  {/* Classical Gold Leaf Ornamental Bracket */}
                  <div className="flex items-center justify-center gap-2 max-w-md mx-auto my-2">
                    <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-[#B8860B] to-[#002984]" />
                    <Sparkles className="w-4 h-4 text-[#B8860B]" />
                    <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-[#B8860B] to-[#002984]" />
                  </div>

                  <div className="text-xs text-slate-700 font-medium">
                    Permanent Resident of <span className="font-bold text-slate-900">{member.address}</span>
                    {member.citizenship_no && (
                      <span> · Citizenship / Identification No: <strong className="font-mono text-slate-900">{member.citizenship_no}</strong></span>
                    )}
                  </div>
                </div>

                {/* Proclamation Paragraph */}
                <div className="text-center text-xs sm:text-sm text-slate-700 max-w-2xl mx-auto leading-relaxed mb-6 font-serif relative z-10">
                  is recognized as a bona fide, duly registered{' '}
                  <strong className="text-[#002984] font-bold uppercase">{member.membership_type || 'General'} Member</strong>{' '}
                  of <strong className="text-slate-900">{org.name || 'Uddhyamsheel Group'}</strong>, endowed with full constitutional rights, democratic voting voice, mutual financial security privileges, and dividend participations governed under the group constitution.
                </div>

                {/* High-Security Metadata Callout Band */}
                <div className="bg-gradient-to-r from-slate-100 via-amber-50/60 to-slate-100 border-y border-[#B8860B]/40 py-2.5 px-6 max-w-2xl mx-auto rounded-lg mb-8 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10 shadow-xs">
                  <div>
                    <span className="text-slate-500 font-medium">Member Identification: </span>
                    <span className="font-mono font-black text-[#002984] text-sm bg-white px-2.5 py-0.5 rounded border border-blue-300 shadow-2xs">
                      {member.id}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium">Original Historical Induction Date: </span>
                    <span className="font-mono font-black text-[#B8860B] text-sm bg-white px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                      {member.membership_date}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium">Record Folio: </span>
                    <span className="font-mono font-bold text-slate-800">
                      Vol. 2079 / {member.id}
                    </span>
                  </div>
                </div>

                {/* ================= LEGAL FOOTER: OFFICIAL SIGNATORIES & CHARTER SEAL ================= */}
                <div className="relative z-10 pt-6 border-t-2 border-slate-200 mt-6">
                  {/* Executive Signatories Grid: Secretary | Official Notary Seal | Chairperson */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                    {/* Left: General Secretary Signature Block */}
                    <div className="text-center flex flex-col items-center justify-end order-2 sm:order-1">
                      {/* Clean Blank Space strictly for Authorized Officer's Physical Ink Signature */}
                      <div className="h-16 w-full" />
                      <div className="w-48 sm:w-52 border-b-2 border-slate-900 mb-2" />
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
                        महासचिव / General Secretary
                      </div>
                      <div className="text-[10.5px] text-slate-600 font-medium">
                        कार्यसमिति (Executive Board)
                      </div>
                      <div className="text-[9.5px] text-[#002984] font-semibold mt-0.5">
                        {org.name || 'Uddhyamsheel Group'}
                      </div>
                    </div>

                    {/* Center: Official Gold Foil Notarized Embossed Medallion Seal */}
                    <div className="flex flex-col items-center justify-center order-1 sm:order-2">
                      <div className="w-28 h-32 relative drop-shadow-xl hover:scale-105 transition-transform">
                        <img src={GOLD_SEAL_DATA_URI} alt="Gold Foil Medallion" className="w-full h-full object-contain" />
                      </div>
                      <div className="text-[10px] font-serif font-black text-[#8B6508] uppercase tracking-widest mt-1">
                        Chartered Notary Seal
                      </div>
                      <div className="text-[9px] text-slate-500 font-medium">
                        Estd. {org.establishedBS || '2079 B.S.'}
                      </div>
                    </div>

                    {/* Right: Chairperson / Authorized Signatory Signature Block */}
                    <div className="text-center flex flex-col items-center justify-end order-3">
                      {/* Clean Blank Space strictly for Authorized Officer's Physical Ink Signature */}
                      <div className="h-16 w-full" />
                      <div className="w-48 sm:w-52 border-b-2 border-slate-900 mb-2" />
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider font-serif">
                        {org.signatoryTitle || 'अध्यक्ष / Chairperson'}
                      </div>
                      <div className="text-[10.5px] text-slate-600 font-medium">
                        कार्यसमिति (Executive Board)
                      </div>
                      <div className="text-[9.5px] text-[#002984] font-semibold mt-0.5">
                        {org.name || 'Uddhyamsheel Group'}
                      </div>
                    </div>
                  </div>

                  {/* Anti-Fraud Security Strip: QR Code, Serial No, Issue Date, Legal Integrity Notice */}
                  <div className="mt-6 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 text-[10px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 bg-white p-1 border border-slate-300 rounded shadow-xs shrink-0 flex items-center justify-center">
                        <QrCode className="w-8 h-8 text-slate-800" />
                      </div>
                      <div className="text-left">
                        <div className="font-mono text-slate-500 text-[9px] uppercase tracking-wider">
                          Security Serial № <span className="font-bold text-red-800 text-[10.5px]">{certificate.certificate_no}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Issue Date: <strong className="text-slate-800">{certificate.issue_date}</strong>
                        </div>
                        <div className="font-mono text-[8.5px] text-slate-400 truncate max-w-[280px]" title={verificationHash}>
                          Hash: {verificationHash}
                        </div>
                      </div>
                    </div>

                    <div className="text-center sm:text-right max-w-sm text-[9.5px] text-slate-500 leading-tight">
                      <p className="font-medium text-slate-700">Official Institutional Instrument</p>
                      <p>Valid upon execution by authorized Uddhyamsheel Group officers and verification in official register.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Guilloché anti-fraud layout verified · High-resolution print & PDF ready</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print A4 Landscape</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-5 py-2 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Official PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

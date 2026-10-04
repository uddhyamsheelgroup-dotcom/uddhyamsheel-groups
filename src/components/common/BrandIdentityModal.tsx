import React, { useState } from 'react';
import { OrgConfig } from '../../types/index.js';
import { LOGO_SVG, STAMP_SVG, LOGO_DATA_URI, STAMP_DATA_URI } from '../../assets/branding.js';
import { Download, Copy, Check, X, Shield, Award, Sparkles, Landmark, Phone, Mail, MapPin } from 'lucide-react';

interface BrandIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  org: OrgConfig;
}

export const BrandIdentityModal: React.FC<BrandIdentityModalProps> = ({ isOpen, onClose, org }) => {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  if (!isOpen) return null;

  const brandColors = [
    { name: 'Deep Sapphire Navy', hex: '#023e8a', role: 'Primary Brand Body' },
    { name: 'Electric Cyan', hex: '#00f5d4', role: 'Dynamic 3D Swoop Highlight' },
    { name: 'Cerulean Sky Blue', hex: '#00b4d8', role: 'Secondary Accent & Bevel' },
    { name: 'Official Stamp Ink Blue', hex: '#002984', role: 'Official Seal & Legal Ring' },
    { name: 'Prosperity Royal Gold', hex: '#f59e0b', role: 'Mahalakshmi Coins & Lotus' },
    { name: 'Executive Midnight', hex: '#01142b', role: 'Command Dark Surface' },
  ];

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const handleDownloadSVG = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-sky-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#01142B] via-[#023e8a] to-[#0077b6] px-6 py-4 flex items-center justify-between text-white border-b border-cyan-400/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white p-1 shadow-md ring-1 ring-cyan-400/60">
              <img src={LOGO_DATA_URI} alt="UG" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-wide font-serif">Official Brand Identity & Official Seal</h3>
                <span className="text-[10px] uppercase font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/40">
                  Authoritative Vector Assets
                </span>
              </div>
              <p className="text-xs text-cyan-200/90">
                {org.name || 'Uddhyamsheel Group'} · Estd. {org.establishedBS || '2079 B.S.'} · {org.address || 'Lumbini, Nepal'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[80vh] space-y-6 bg-slate-50/60">
          {/* Dual Showcase Cards: Logo & Stamp */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Official 3D "UG" Logo Card */}
            <div className="bg-white rounded-2xl p-6 border border-sky-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-cyan-400 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-700">Official Brand Logo</span>
                    <h4 className="text-lg font-bold text-slate-900 font-serif">"UG" Modern 3D Swoop</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    Scalable Vector (SVG)
                  </span>
                </div>

                {/* Vector Canvas Container */}
                <div className="h-56 bg-gradient-to-b from-[#01142b] to-[#02224d] rounded-xl flex items-center justify-center p-6 border border-sky-900/60 shadow-inner relative">
                  <div className="w-40 h-40 drop-shadow-2xl">
                    <img src={LOGO_DATA_URI} alt="Official UG Logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute bottom-2 right-3 text-[10px] text-cyan-300/80 font-mono">
                    Vector 500x500
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-600 leading-relaxed">
                  <p>
                    Precision 3D typography featuring interconnected letters <strong>'U'</strong> and <strong>'G'</strong> in royal sapphire navy with glossy bevels, sliced dynamically by an aerodynamic electric cyan swoop.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  Usage: <span className="font-medium text-slate-700">Headers, Mobile Apps, Marketing</span>
                </div>
                <button
                  onClick={() => handleDownloadSVG(LOGO_SVG, 'uddhyamsheel_group_logo.svg')}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </button>
              </div>
            </div>

            {/* 2. Official Mahalakshmi Stamp Card */}
            <div className="bg-white rounded-2xl p-6 border border-sky-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-blue-400 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Official Legal Stamp</span>
                    <h4 className="text-lg font-bold text-slate-900 font-serif">Gajalakshmi Cooperative Seal</h4>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                    Circular Stamp
                  </span>
                </div>

                {/* Vector Canvas Container */}
                <div className="h-56 bg-slate-50 rounded-xl flex items-center justify-center p-6 border border-slate-200 shadow-inner relative">
                  <div className="w-44 h-44 drop-shadow-md">
                    <img src={STAMP_DATA_URI} alt="Official Stamp" className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-mono">
                    Concentric Ink 500x500
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-600 leading-relaxed">
                  <p>
                    Authoritative double concentric circular bank seal. Center depicts Goddess Mahalakshmi seated upon a blooming lotus flanked by two elephants showering wealth coins, Estd. 2079 B.S., Lumbini, Nepal, and contact credentials.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  Usage: <span className="font-medium text-slate-700">Receipts, Certificates, Deeds</span>
                </div>
                <button
                  onClick={() => handleDownloadSVG(STAMP_SVG, 'uddhyamsheel_group_stamp.svg')}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#002984] to-[#005a9e] hover:from-[#001f66] hover:to-[#004a82] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Stamp</span>
                </button>
              </div>
            </div>
          </div>

          {/* Color Palette Tokens */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Official Brand Color Palette</h4>
                <p className="text-xs text-slate-500">Click any color swatch to copy its hexadecimal code</p>
              </div>
              <Sparkles className="w-4 h-4 text-cyan-500" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {brandColors.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => handleCopy(color.hex)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-cyan-400 hover:shadow-md transition-all text-left group bg-slate-50/50 cursor-pointer"
                >
                  <div
                    className="w-full h-10 rounded-lg shadow-inner mb-2.5 flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{ backgroundColor: color.hex }}
                  >
                    {copiedColor === color.hex && (
                      <Check className="w-4 h-4 text-white drop-shadow" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-800 font-mono flex items-center justify-between">
                    <span>{color.hex}</span>
                    <Copy className="w-3 h-3 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">{color.name}</div>
                  <div className="text-[9.5px] text-slate-400 truncate">{color.role}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Official Cooperative Charter Data */}
          <div className="bg-gradient-to-r from-slate-900 to-[#021833] rounded-2xl p-5 text-white border border-sky-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-widest">
                Chartered Registration & Credential Verification
              </div>
              <h5 className="text-lg font-serif font-bold text-white">
                {org.name || 'Uddhyamsheel Group'} ({org.nepaliName || 'उद्यमशील समूह'})
              </h5>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-amber-400" />
                  <span>Established: <strong className="text-white">{org.establishedBS || '2079 B.S.'}</strong> ({org.establishedAD || '2023 A.D.'})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{org.address || 'Lumbini, Nepal'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono">{org.phone}</span>
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white p-0.5 ring-2 ring-amber-400/80 shadow-md">
                <img src={STAMP_DATA_URI} alt="Seal" className="w-full h-full object-contain" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close Brand Kit
          </button>
        </div>
      </div>
    </div>
  );
};

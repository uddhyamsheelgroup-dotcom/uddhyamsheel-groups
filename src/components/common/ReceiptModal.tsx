import React from 'react';
import { OrgConfig } from '../../types/index.js';
import { generateReceiptPDF, formatNPR, numberToWords } from '../../utils/pdf.js';
import { STAMP_DATA_URI, LOGO_DATA_URI } from '../../assets/branding.js';
import { Printer, Download, X, CheckCircle } from 'lucide-react';

interface ReceiptData {
  receiptNo: string;
  date: string;
  memberId: string;
  memberName: string;
  category: string;
  amount: number;
  paymentMethod: string;
  description: string;
  balanceAfter?: number;
}

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  org: OrgConfig;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, org, onClose }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateReceiptPDF(receipt, org);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-sky-200">
        {/* Modal Action Bar with Sapphire & Cyan Gradient */}
        <div className="bg-gradient-to-r from-[#021833] via-[#023e8a] to-[#0077b6] px-6 py-4 flex items-center justify-between text-white border-b border-sky-400/30">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white p-0.5 shadow-sm">
              <img src={LOGO_DATA_URI} alt="UG" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm tracking-wide">Official Cooperative Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 text-cyan-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="p-1.5 text-amber-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 bg-slate-50/70 print:p-0 print:bg-white" id="printable-receipt">
          <div className="bg-white border-2 border-slate-900 rounded-xl p-6 relative shadow-sm">
            {/* Header with UG Logo and Details */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div className="w-14 h-14 bg-white p-1 rounded-xl shadow-xs border border-slate-100 shrink-0">
                <img src={LOGO_DATA_URI} alt="UG Logo" className="w-full h-full object-contain" />
              </div>

              <div className="text-center flex-1 px-3">
                <h2 className="text-xl font-extrabold text-[#002984] tracking-tight font-serif">
                  {org.name || 'UDDHYAMSHEEL GROUP'}
                </h2>
                <div className="text-sm font-bold text-blue-900">{org.nepaliName || 'उद्यमशील समूह'}</div>
                <div className="text-[10.5px] text-slate-500 mt-0.5">
                  {org.address || 'Lumbini, Nepal'} · Estd. {org.establishedBS || '2079 B.S.'} · Tel: {org.phone}
                </div>
              </div>

              <div className="w-14 h-14 shrink-0 opacity-0 sm:opacity-100">
                <img src={LOGO_DATA_URI} alt="" className="w-full h-full object-contain invisible" />
              </div>
            </div>

            <div className="text-center mb-4">
              <span className="inline-block bg-[#002984] text-white text-[11px] font-bold px-3.5 py-0.5 uppercase tracking-widest rounded-sm">
                OFFICIAL TRANSACTION RECEIPT
              </span>
            </div>

            {/* Receipt No & Date */}
            <div className="flex justify-between items-center text-xs text-slate-600 mb-4 pb-2 border-b border-dashed border-slate-200">
              <div>
                <span className="text-slate-400">Receipt No: </span>
                <span className="font-mono font-bold text-[#002984]">{receipt.receiptNo}</span>
              </div>
              <div>
                <span className="text-slate-400">Date: </span>
                <span className="font-semibold text-slate-900">{receipt.date}</span>
              </div>
            </div>

            {/* Member Details */}
            <div className="bg-sky-50/60 rounded-xl p-3 text-xs mb-4 border border-sky-100 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Received From:</span>
                <span className="font-bold text-slate-900">{receipt.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Member ID:</span>
                <span className="font-mono font-bold text-[#002984]">{receipt.memberId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Category:</span>
                <span className="font-semibold text-blue-900">{receipt.category}</span>
              </div>
            </div>

            {/* Amount Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
              <div className="bg-slate-900 px-3.5 py-2 text-xs font-bold text-white flex justify-between">
                <span>Description / Particulars</span>
                <span>Amount (NPR)</span>
              </div>
              <div className="p-3 text-xs space-y-1 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-slate-900">{receipt.description}</div>
                    <div className="text-[11px] text-slate-500">Payment Mode: {receipt.paymentMethod}</div>
                  </div>
                  <div className="text-base font-bold font-mono text-[#002984]">
                    {formatNPR(receipt.amount)}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-3.5 py-2 text-xs border-t border-slate-200">
                <span className="text-slate-500">In Words: </span>
                <span className="font-medium text-slate-800 italic">{numberToWords(receipt.amount)}</span>
              </div>
            </div>

            {receipt.balanceAfter !== undefined && (
              <div className="text-xs text-slate-600 mb-4 bg-sky-50 border border-sky-200/80 rounded-lg p-2.5 flex justify-between">
                <span className="text-slate-500 font-medium">Updated Account Balance:</span>
                <span className="font-mono font-bold text-slate-900">{formatNPR(receipt.balanceAfter)}</span>
              </div>
            )}

            {/* Official Stamp & Signatory Section */}
            <div className="flex items-end justify-between pt-4 mt-2 border-t border-slate-200">
              {/* Authentic Mahalakshmi Stamp */}
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border border-blue-900/20 shadow-xs bg-white p-0.5">
                  <img src={STAMP_DATA_URI} alt="Official Seal" className="w-full h-full object-contain" />
                </div>
                <span className="text-[9px] text-blue-900 font-extrabold uppercase tracking-wider mt-1">Official Seal</span>
              </div>

              <div className="text-center">
                <div className="w-36 border-b border-slate-900 mb-1" />
                <div className="text-xs font-bold text-slate-900">Authorized Receiver</div>
                <div className="text-[10px] text-slate-500">Uddhyamsheel Group</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons with Cyan/Sapphire Theme */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-gradient-to-r from-blue-700 to-cyan-600 hover:from-blue-600 hover:to-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download Official PDF</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

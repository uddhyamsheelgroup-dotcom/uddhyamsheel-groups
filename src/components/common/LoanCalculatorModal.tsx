import React, { useState } from 'react';
import { formatNPR } from '../../utils/pdf.js';
import { Calculator, X, HelpCircle } from 'lucide-react';

interface LoanCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPrincipal?: number;
  defaultRate?: number;
}

export const LoanCalculatorModal: React.FC<LoanCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultPrincipal = 50000,
  defaultRate = 12.0
}) => {
  const [principal, setPrincipal] = useState(defaultPrincipal);
  const [rate, setRate] = useState(defaultRate);
  const [months, setMonths] = useState(12);
  const [method, setMethod] = useState<'REDUCING_BALANCE' | 'FLAT_RATE'>('REDUCING_BALANCE');

  if (!isOpen) return null;

  // Schedule Calculation
  const schedule: Array<{
    month: number;
    openingBalance: number;
    principalPortion: number;
    interestPortion: number;
    totalInstallment: number;
    closingBalance: number;
  }> = [];

  let totalInterest = 0;
  let totalRepayment = 0;

  if (method === 'FLAT_RATE') {
    // Flat rate calculation
    totalInterest = Math.round((principal * (rate / 100) * (months / 12)) * 100) / 100;
    totalRepayment = principal + totalInterest;
    const monthlyPrincipal = Math.round((principal / months) * 100) / 100;
    const monthlyInterest = Math.round((totalInterest / months) * 100) / 100;

    let balance = principal;
    for (let i = 1; i <= months; i++) {
      const p = i === months ? balance : monthlyPrincipal;
      balance = Math.max(0, Math.round((balance - p) * 100) / 100);
      schedule.push({
        month: i,
        openingBalance: balance + p,
        principalPortion: p,
        interestPortion: monthlyInterest,
        totalInstallment: p + monthlyInterest,
        closingBalance: balance
      });
    }
  } else {
    // Reducing balance calculation (EMI standard or reducing monthly)
    const monthlyRate = (rate / 100) / 12;
    let balance = principal;
    const monthlyPrincipal = Math.round((principal / months) * 100) / 100;

    for (let i = 1; i <= months; i++) {
      const interest = Math.round((balance * monthlyRate) * 100) / 100;
      const p = i === months ? balance : monthlyPrincipal;
      const closing = Math.max(0, Math.round((balance - p) * 100) / 100);
      totalInterest += interest;

      schedule.push({
        month: i,
        openingBalance: balance,
        principalPortion: p,
        interestPortion: interest,
        totalInstallment: p + interest,
        closingBalance: closing
      });

      balance = closing;
    }
    totalRepayment = principal + totalInterest;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-sm">Professional Cooperative Loan Calculator</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Principal (Rs.)</label>
              <input
                type="number"
                min="1000"
                step="5000"
                value={principal}
                onChange={(e) => setPrincipal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Rate (% p.a.)</label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={rate}
                onChange={(e) => setRate(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
              />
              <span className="text-[10px] text-slate-500">{(rate / 12).toFixed(2)}% monthly</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tenure (Months)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={months}
                onChange={(e) => setMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Method</label>
              <select
                value={method}
                onChange={(e: any) => setMethod(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-amber-500"
              >
                <option value="REDUCING_BALANCE">Reducing Balance (Standard)</option>
                <option value="FLAT_RATE">Flat Rate</option>
              </select>
            </div>
          </div>

          {/* Explanation note */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Calculation Method: </span>
              {method === 'REDUCING_BALANCE'
                ? 'Reducing Balance calculates interest solely on the remaining unpaid principal each month, reducing interest costs as principal is repaid.'
                : 'Flat Rate calculates interest on the original loan amount throughout the full loan duration.'}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block">Principal</span>
              <span className="text-base font-bold font-mono text-slate-900">{formatNPR(principal)}</span>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-center">
              <span className="text-[11px] text-amber-800 block">Total Interest</span>
              <span className="text-base font-bold font-mono text-amber-900">{formatNPR(totalInterest)}</span>
            </div>
            <div className="bg-slate-900 text-white rounded-lg p-3 text-center">
              <span className="text-[11px] text-slate-400 block">Total Repayment</span>
              <span className="text-base font-bold font-mono text-amber-400">{formatNPR(totalRepayment)}</span>
            </div>
          </div>

          {/* Schedule Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">Estimated Repayment Schedule</h4>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Month</th>
                    <th className="py-2 px-3">Opening</th>
                    <th className="py-2 px-3">Principal</th>
                    <th className="py-2 px-3">Interest</th>
                    <th className="py-2 px-3">Installment</th>
                    <th className="py-2 px-3">Closing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {schedule.map((row) => (
                    <tr key={row.month} className="hover:bg-slate-50">
                      <td className="py-1.5 px-3 font-semibold text-slate-800">{row.month}</td>
                      <td className="py-1.5 px-3 text-slate-600">{formatNPR(row.openingBalance)}</td>
                      <td className="py-1.5 px-3 text-slate-800">{formatNPR(row.principalPortion)}</td>
                      <td className="py-1.5 px-3 text-amber-700">{formatNPR(row.interestPortion)}</td>
                      <td className="py-1.5 px-3 font-bold text-slate-950">{formatNPR(row.totalInstallment)}</td>
                      <td className="py-1.5 px-3 text-slate-600">{formatNPR(row.closingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

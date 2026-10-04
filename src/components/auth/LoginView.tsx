import React, { useState } from 'react';
import { api } from '../../api/client.js';
import { UserSession, OrgConfig } from '../../types/index.js';
import { LOGO_DATA_URI, STAMP_DATA_URI } from '../../assets/branding.js';
import { Shield, User, Lock, AlertCircle, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';

import { validateMemberPin, validateAdminPin, validateNumericPin, MEMBER_PIN_LENGTH, ADMIN_PIN_LENGTH } from '../../utils/pinValidation.js';

interface LoginViewProps {
  org: OrgConfig;
  onLoginSuccess: (user: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ org, onLoginSuccess }) => {
  const [role, setRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN');
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !pin) {
      setError('Please provide both your ID and PIN.');
      return;
    }

    // Strict frontend PIN validation: Member = 6 digits, Admin = 6–8 digits
    const pinCheck =
      role === 'MEMBER'
        ? validateMemberPin(pin.trim(), 'Member PIN', false)
        : validateAdminPin(pin.trim(), 'Admin PIN', false);

    if (!pinCheck.isValid) {
      setError(pinCheck.error || 'Please enter a valid numeric PIN.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.login(identifier.trim(), pin.trim(), role);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your ID and PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#01142B] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Radial Glows matching the UG Cyan & Sapphire */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-cyan-500/15 via-blue-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        {/* Emblem & Brand Header with Official UG Logo */}
        <div className="text-center">
          <div className="relative inline-block mb-4">
            {/* Ambient Cyan Aura */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-3xl blur-md opacity-60 animate-pulse" />
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-2.5 shadow-2xl flex items-center justify-center ring-2 ring-cyan-400/80">
              <img src={LOGO_DATA_URI} alt="UG Logo" className="w-full h-full object-contain drop-shadow" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
            {org.name || 'UDDHYAMSHEEL GROUP'}
          </h1>
          <p className="text-cyan-300 font-semibold text-sm mt-1 flex items-center justify-center gap-2">
            <span>{org.nepaliName || 'उद्यमशील समूह'}</span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-400 font-bold">{org.establishedBS || 'Estd. 2079 B.S.'}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {org.address || 'Lumbini, Nepal'} · Official Cooperative Management Platform
          </p>
        </div>

        {/* Card Box with Glassmorphism Sapphire Edge */}
        <div className="mt-7 bg-[#031d3d]/90 border border-cyan-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative">
          {/* Top cyan gradient highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-300 rounded-t-2xl" />

          {/* Role Selector Tabs (Segmented functional buttons) */}
          <div className="flex rounded-xl bg-slate-950/80 p-1 mb-6 border border-sky-900/60 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setRole('ADMIN');
                setError(null);
                setIdentifier('');
                setPin('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                role === 'ADMIN'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Administrator</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('MEMBER');
                setError(null);
                setIdentifier('');
                setPin('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                role === 'MEMBER'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Member Portal</span>
            </button>
          </div>

          {error && (
            <div className="mb-5 bg-rose-950/70 border border-rose-700/80 rounded-xl p-3 text-xs text-rose-200 flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5">
                {role === 'ADMIN' ? 'Administrator Username' : 'Member ID / Mobile Phone'}
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={role === 'ADMIN' ? 'Enter username' : 'e.g. UDG001 or 9743403017'}
                className="w-full bg-slate-950/90 border border-sky-800/80 rounded-xl px-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5">
                {role === 'ADMIN' ? 'Security PIN (6–8 Digits)' : 'Member PIN (6 Digits)'}
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={role === 'MEMBER' ? 6 : 8}
                  autoComplete="current-password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={role === 'MEMBER' ? '••••••' : '••••••••'}
                  className="w-full bg-slate-950/90 border border-sky-800/80 rounded-xl px-3.5 py-3 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all font-mono tracking-widest text-center text-sm font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 p-1 transition-colors"
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-cyan-400 text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 disabled:opacity-50 tracking-wider uppercase cursor-pointer"
            >
              {loading ? (
                <span>Authenticating Securely...</span>
              ) : (
                <>
                  <span>Sign In to {role === 'ADMIN' ? 'Administration' : 'Member Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Stamp Preview Indicator */}
          <div className="mt-6 pt-4 border-t border-sky-900/60 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white p-0.5 ring-1 ring-cyan-400/40">
                <img src={STAMP_DATA_URI} alt="Stamp" className="w-full h-full object-contain" />
              </div>
              <span className="text-[11px] text-slate-300 font-medium">Gajalakshmi Prosperity Seal</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-medium">
              <Lock className="w-3 h-3" />
              <span>Encrypted Session</span>
            </div>
          </div>
        </div>

        {/* Footer contact */}
        <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
          <div>Phone: <span className="text-cyan-300 font-mono font-semibold">{org.phone}</span></div>
          <div>Email: <span className="text-cyan-300 font-mono">{org.email}</span></div>
        </div>
      </div>
    </div>
  );
};

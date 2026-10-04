import React, { useState } from 'react';
import { UserSession, OrgConfig } from '../../types/index.js';
import { LOGO_DATA_URI } from '../../assets/branding.js';
import { LogOut, Bell, Shield, User, ChevronDown } from 'lucide-react';

interface HeaderProps {
  user: UserSession;
  org: OrgConfig;
  onLogout: () => void;
  activeTab: string;
  unreadCount?: number;
  onNotificationsClick?: () => void;
  onToggleMobileMenu?: () => void;
  onOpenBrandKit?: () => void;
  onProfileClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  org,
  onLogout,
  unreadCount = 0,
  onNotificationsClick,
  onToggleMobileMenu,
  onOpenBrandKit,
  onProfileClick
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-[#021833] border-b border-sky-900/60 text-white shadow-lg backdrop-blur-md">
      {/* Top subtle cyan energy line matching the UG Swoop */}
      <div className="h-0.5 w-full bg-gradient-to-r from-sky-600 via-cyan-400 to-teal-300" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* ================= LEFT: [MENU] + [UDDHYAMSHEEL] ================= */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* [Menu] Button */}
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-cyan-400 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              aria-label="Open navigation menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* [Uddhyamsheel] Brand Lockup */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/40 shrink-0">
                <img src={LOGO_DATA_URI} alt="UG Logo" className="w-full h-full object-contain drop-shadow-xs" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-black text-xs sm:text-base tracking-tight text-white font-serif truncate">
                    UDDHYAMSHEEL
                  </span>
                  <span className="hidden sm:inline-block text-[10.5px] font-bold uppercase tracking-wider text-cyan-300 bg-sky-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30 shrink-0">
                    {org.establishedBS || 'Estd 2079 B.S.'}
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-cyan-200/80 hidden sm:flex items-center gap-1.5 truncate">
                  <span>{org.nepaliName || 'उद्यमशील समूह'}</span>
                  <span>·</span>
                  <span className="text-slate-400 truncate">{org.address || 'Lumbini, Nepal'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT: [BRAND & SEAL] + [NOTIFICATIONS] + [PROFILE] ================= */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Desktop Brand & Seal Modal Trigger */}
            {onOpenBrandKit && (
              <button
                onClick={onOpenBrandKit}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-900/60 to-cyan-950/60 hover:from-blue-800/80 hover:to-cyan-900/80 border border-cyan-400/40 rounded-xl text-xs font-bold text-cyan-300 transition-all shadow-xs cursor-pointer min-h-[38px]"
                title="View Official Logo, Seal, and Brand Palette"
              >
                <div className="w-4 h-4 rounded-full bg-white p-0.5 shrink-0 ring-1 ring-cyan-400/60">
                  <img src={LOGO_DATA_URI} alt="" className="w-full h-full object-contain" />
                </div>
                <span>Brand & Seal</span>
              </button>
            )}

            {/* [Notifications] Icon Button */}
            {onNotificationsClick && (
              <button
                onClick={onNotificationsClick}
                className="relative p-2 text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-cyan-400 rounded-full ring-2 ring-[#021833] animate-pulse" />
                )}
              </button>
            )}

            {/* [Profile] Trigger & Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/30 rounded-xl px-2 sm:px-2.5 py-1.5 shadow-xs transition-colors cursor-pointer min-h-[44px]"
                aria-label="User profile options"
                aria-expanded={profileDropdownOpen}
              >
                {user.role === 'ADMIN' ? (
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shrink-0 font-bold text-xs">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white shrink-0 font-bold text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="text-left hidden sm:block max-w-[110px] md:max-w-[140px]">
                  <div className="text-xs font-bold text-slate-100 leading-tight truncate">
                    {user.fullName || user.username}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span className="font-semibold text-cyan-300">{user.role}</span>
                    {user.memberId && <span className="font-mono text-white">[{user.memberId}]</span>}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-[#011833] border border-sky-800 rounded-2xl shadow-2xl py-2 z-50 text-xs">
                    <div className="px-3.5 py-2.5 border-b border-sky-900/60">
                      <div className="font-bold text-white text-xs truncate">
                        {user.fullName || user.username}
                      </div>
                      <div className="text-[11px] text-cyan-300 font-semibold mt-0.5">
                        {user.role === 'ADMIN' ? 'Executive Administrator' : `Member [${user.memberId}]`}
                      </div>
                      {user.email && (
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {user.email}
                        </div>
                      )}
                    </div>

                    {onProfileClick && (
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onProfileClick();
                        }}
                        className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-slate-800 hover:text-cyan-300 transition-colors flex items-center gap-2"
                      >
                        <User className="w-4 h-4 text-cyan-400" />
                        <span>View My Profile</span>
                      </button>
                    )}

                    {onOpenBrandKit && (
                      <button
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenBrandKit();
                        }}
                        className="w-full text-left px-3.5 py-2 text-slate-200 hover:bg-slate-800 hover:text-cyan-300 transition-colors flex items-center gap-2 md:hidden"
                      >
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span>Official Brand & Seal</span>
                      </button>
                    )}

                    <div className="my-1 border-t border-sky-900/60" />

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-rose-300 hover:bg-rose-950/40 transition-colors flex items-center gap-2 font-semibold"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Desktop Quick Logout */}
            <button
              onClick={onLogout}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors text-xs font-semibold min-h-[44px] cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

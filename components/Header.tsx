import React from 'react';
import { Bike, Shield, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  isAdmin: boolean;
  onAdminToggle?: () => void;
  darkMode: boolean;
  onThemeToggle: () => void;
  showAdminExit?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isAdmin, onAdminToggle, darkMode, onThemeToggle, showAdminExit }) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-150 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B6B3A] flex items-center justify-center shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#09572E] to-[#32b56e] opacity-20"></div>
            <span className="text-white font-black text-base font-mono tracking-tighter relative z-10">CR</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black tracking-tight uppercase text-gray-950 dark:text-white leading-none">
                Campus<span className="text-[#0B6B3A] dark:text-[#32b56e]">Runner</span>
              </h1>
              <span className="bg-emerald-50 dark:bg-[#32b56e]/10 text-[#0B6B3A] dark:text-[#32b56e] font-sans font-black text-[7px] tracking-widest uppercase px-1.5 py-0.5 rounded border border-[#0B6B3A]/15 dark:border-[#32b56e]/20 leading-none">
                SECURE
              </span>
            </div>
            <p className="text-[8px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
              {isAdmin ? 'RUNNER LOGISTICS TERMINAL' : 'SECURE ON-DEMAND SYSTEM'}
            </p>
          </div>
        </div>

        {/* Administration & Theme toggles */}
        <div className="flex items-center gap-3">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={onThemeToggle}
            id="theme-mode-toggle"
            aria-label="Toggle nighttime lighting theme"
            className="p-1.5 rounded-lg border border-gray-200 dark:border-slate-750 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
          >
            {darkMode ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-600" />
            )}
          </button>

          {showAdminExit && onAdminToggle && (
            <button
              onClick={onAdminToggle}
              id="admin-entrance-button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-850"
            >
              <Shield className="w-3.5 h-3.5" />
              Exit Admin
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

export default Header;

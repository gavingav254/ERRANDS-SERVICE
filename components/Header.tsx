
import React from 'react';

interface HeaderProps {
  view: 'student' | 'runner';
  setView: (view: 'student' | 'runner') => void;
  userEmail: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ view, setView, userEmail, onLogout }) => {
  return (
    <header className="bg-embu-green text-white sticky top-0 z-50 shadow-lg border-b-4 border-embu-gold">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-embu-gold rounded-full flex items-center justify-center text-embu-green font-bold text-sm">
              ES
            </div>
            <h1 className="text-lg font-black tracking-tight uppercase">ERRANDS <span className="text-embu-gold">SERVICE</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-[10px] font-black uppercase tracking-tighter text-embu-gold">Logged In As</div>
              <div className="text-xs font-medium opacity-80">{userEmail}</div>
            </div>
            <button 
              onClick={onLogout}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        <nav className="flex bg-embu-darkGreen rounded-xl p-1 shadow-inner">
          <button 
            onClick={() => setView('student')}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'student' ? 'bg-embu-gold text-embu-green shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            Request Errand
          </button>
          <button 
            onClick={() => setView('runner')}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'runner' ? 'bg-embu-gold text-embu-green shadow-sm' : 'text-gray-400 hover:text-white'}`}
          >
            Runner Mode
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;

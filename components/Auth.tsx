
import React, { useState } from 'react';

interface AuthProps {
  onLogin: (email: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      onLogin(email);
    } else {
      alert("Please enter a valid university email.");
    }
  };

  const handleGoogleLogin = () => {
    // Simulating Google Login with a generic student email as requested
    const mockGoogleEmail = 'student@embuni.ac.ke';
    onLogin(mockGoogleEmail);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl border-4 border-embu-gold overflow-hidden transition-all duration-500 hover:shadow-embu-green/20">
        <div className="bg-embu-green p-12 text-center relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-embu-gold opacity-10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white opacity-5 rounded-full" />
          
          <div className="w-24 h-24 bg-embu-gold rounded-[2rem] flex items-center justify-center text-embu-green font-black text-4xl mx-auto mb-6 shadow-2xl border-4 border-white/20 transform -rotate-3">
            ES
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-2">ERRANDS</h2>
          <h2 className="text-4xl font-black text-embu-gold tracking-tighter uppercase leading-none">SERVICE</h2>
          <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mt-4">University of Embu</p>
        </div>
        
        <div className="p-10 space-y-8">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-4 py-5 px-6 bg-white border-2 border-gray-100 rounded-3xl font-black text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-[0.98] uppercase text-xs tracking-widest"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-6 text-gray-300 text-[9px] font-black uppercase tracking-[0.4em]">OR</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">University Portal Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@embuni.ac.ke"
                className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-3xl focus:bg-white focus:ring-8 focus:ring-embu-green/5 focus:border-embu-green outline-none transition-all text-gray-800 font-bold placeholder:text-gray-300 shadow-inner"
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-5 bg-embu-green hover:bg-embu-darkGreen text-white rounded-3xl font-black text-lg shadow-2xl shadow-embu-green/30 hover:shadow-embu-green/50 active:scale-[0.98] transition-all tracking-widest"
            >
              LOGIN
            </button>
          </form>
          
          <div className="pt-8 flex flex-col items-center gap-3">
            <div className="h-1 w-12 bg-embu-gold rounded-full opacity-30" />
            <p className="text-[10px] text-gray-300 uppercase tracking-[0.3em] font-black text-center">
              Campus Security Enabled &bull; Embu Uni
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

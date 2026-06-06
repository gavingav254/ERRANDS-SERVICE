import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Errand, ErrandCategory, ErrandUrgency, PaymentMethod } from './types';
import CreateErrand from './components/CreateErrand';
import OrderTracking from './components/OrderTracking';
import RunnerDashboard from './components/RunnerDashboard';
import AdminDashboard from './components/AdminDashboard';
import Header from './components/Header';
import StudentDashboard from './components/StudentDashboard';
import { ChevronRight, ClipboardList, Search, Compass, Shield, History, Sparkles, Phone, FileText, Home, PlusCircle, User } from 'lucide-react';

const App: React.FC = () => {
  const location = useLocation();
  const [isAdminVerified, setIsAdminVerified] = useState(() => {
    return sessionStorage.getItem('cr-admin-verified') === 'true';
  });

  // Local student profile cached state
  const [profileName, setProfileName] = useState(() => localStorage.getItem('cr-profile-name') || '');
  const [profilePhone, setProfilePhone] = useState(() => localStorage.getItem('cr-profile-phone') || '');

  // Runner Availability Status
  const [runnerStatus, setRunnerStatus] = useState<'Available' | 'Busy' | 'Offline'>('Available');

  // Dark Mode Theme toggle state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Order Tracking states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedErrandId, setSelectedErrandId] = useState<string | null>(null);
  
  // Real-time synced errands list
  const [allErrands, setAllErrands] = useState<Errand[]>([]);
  const [syncLoading, setSyncLoading] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Recent Placed Order Reference IDs preserved locally
  const [recentOrderIds, setRecentOrderIds] = useState<string[]>([]);

  // Simple Notification Alerts state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' }[]>([]);

  // Admin passkey state
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminError, setAdminError] = useState('');

  const addToast = (message: string, type: 'success' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // 1. Synchronize real-time Errand orders
  useEffect(() => {
    const errandsCol = collection(db, 'errands');
    setSyncLoading(true);

    const unsubscribe = onSnapshot(errandsCol, (snapshot) => {
      const fetched: Errand[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() } as Errand);
      });

      // Sort newest order first
      fetched.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setAllErrands(fetched);
      setSyncLoading(false);
    }, (error) => {
      console.error('Errand real-time socket subscription failure:', error);
      setSyncLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'errands');
    });

    // Recover recently placed order references from client local store
    const stored = localStorage.getItem('recent-cr-orders');
    if (stored) {
      try {
        setRecentOrderIds(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent orders from localStorage', e);
      }
    }

    return () => unsubscribe();
  }, []);

  // 2. Synchronize active settings (Runner status) in real-time
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'runner');
    const unsubscribeSettings = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRunnerStatus(data.status || 'Available');
      } else {
        setRunnerStatus('Available');
      }
    }, (error) => {
      console.error('Settings real-time socket subscription failure:', error);
    });

    return () => unsubscribeSettings();
  }, []);

  // Submit new errand creation
  const handleCreateOrder = async (data: {
    fullName: string;
    phoneNumber: string;
    category: ErrandCategory;
    description: string;
    location: string;
    budget: number | null;
    urgency: ErrandUrgency;
    paymentMethod: PaymentMethod;
    notes: string | null;
    estimatedFee: number;
    deliveryZone: 'Campus Delivery' | 'Outside Campus Delivery';
  }) => {
    // If offline, block submission immediately as a secondary client safety
    if (runnerStatus === 'Offline') {
      addToast('CampusRunner is offline right now. We cannot accept orders.', 'info');
      return;
    }

    setSubmittingNote(true);

    // Create custom user-friendly short tracking Order ID: CR-XXXXX
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const shortOrderId = `CR-${randomHex}`;
    const errandDocId = `errand_${Math.random().toString(36).substring(2, 11)}`;

    // Set first Estimated Arrival Time based on Urgency immediately
    const firstEta = data.urgency === 'ASAP' ? '20-30 Mins' : '30-45 Mins';

    const newErrandPayload: Errand = {
      id: errandDocId,
      orderId: shortOrderId,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      category: data.category,
      description: data.description,
      location: data.location,
      budget: data.budget,
      urgency: data.urgency,
      status: 'Pending',
      paymentMethod: data.paymentMethod,
      paymentStatus: 'Pending Payment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeline: [
        { status: 'Errand posted by student. Despatched to courier coordination pool.', timestamp: new Date().toISOString() }
      ],
      estimatedTime: firstEta,
      runnerNote: null,
      notes: data.notes,
      estimatedFee: data.estimatedFee,
      deliveryZone: data.deliveryZone,
    };

    try {
      await setDoc(doc(db, 'errands', errandDocId), newErrandPayload);

      // Save order id directly into local state & storage registry to simplify tracking
      const updatedRecent = [shortOrderId, ...recentOrderIds.filter(id => id !== shortOrderId)].slice(0, 5);
      setRecentOrderIds(updatedRecent);
      localStorage.setItem('recent-cr-orders', JSON.stringify(updatedRecent));

      // Cache contact info in Profile if empty
      if (!profileName.trim()) {
        setProfileName(data.fullName);
        localStorage.setItem('cr-profile-name', data.fullName);
      }
      if (!profilePhone.trim()) {
        setProfilePhone(data.phoneNumber);
        localStorage.setItem('cr-profile-phone', data.phoneNumber);
      }

      addToast(`Errand registered! Track Code: ${shortOrderId}`, 'success');
      setSelectedErrandId(errandDocId);
    } catch (err) {
      console.error('Error recording errand:', err);
      addToast('Failed to post order. Verify connection and retry.', 'info');
      handleFirestoreError(err, OperationType.CREATE, `errands/${errandDocId}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  // Secure passkey checkpoint to access Logistics dashboard
  const handleVerifyAdminPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    if (adminPasscode === 'admin123') {
      setIsAdminVerified(true);
      sessionStorage.setItem('cr-admin-verified', 'true');
      setAdminPasscode('');
      addToast('Logged into Coordinator Admin Terminal!', 'success');
    } else {
      setAdminError('Invalid logistics passphrase key.');
    }
  };

  const handleExitAdmin = () => {
    setIsAdminVerified(false);
    sessionStorage.removeItem('cr-admin-verified');
    addToast('Exited logistics administrator mode.', 'info');
  };

  const handleUpdateRunnerStatus = async (nextStatus: 'Available' | 'Busy' | 'Offline') => {
    try {
      await setDoc(doc(db, 'settings', 'runner'), { status: nextStatus }, { merge: true });
      addToast(`Logistics mode set to ${nextStatus}`, 'success');
    } catch (err) {
      console.error('Error updating status settings:', err);
      addToast('Failed to change status. Verify connection.', 'info');
    }
  };

  // Search Results Lookup matching either Order ID (CR-XXXX) or Phone Number
  const searchResults = allErrands.filter((errand) => {
    if (!errand) return false;
    const trimmedQuery = (searchQuery || '').trim().toLowerCase();
    if (!trimmedQuery) return false;
    const orderId = errand.orderId || '';
    const phoneNumber = errand.phoneNumber || '';
    return (
      orderId.toLowerCase().includes(trimmedQuery) ||
      phoneNumber.toLowerCase().includes(trimmedQuery)
    );
  });

  // Recent Placed orders resolution
  const mappedRecentOrders = allErrands.filter((errand) =>
    errand && errand.orderId && recentOrderIds.includes(errand.orderId)
  );

  const selectedErrand = allErrands.find((e) => e.id === selectedErrandId);

  // Protected Admin Routes
  const AdminRoute = ({ element }: { element: React.ReactNode }) => {
    if (!isAdminVerified) {
      return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col justify-between pb-28 font-sans transition-colors duration-200">
          <Header 
            isAdmin={false} 
            darkMode={darkMode}
            onThemeToggle={() => setDarkMode(prev => !prev)}
            showAdminExit={false}
            onAdminToggle={handleExitAdmin}
          />
          <main className="container mx-auto max-w-4xl px-4 py-6 flex-grow pb-12">
            <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6 animate-fade-in my-12">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-slate-50">
                  Logistics Coordinator Portal
                </h3>
                <p className="text-xs text-gray-400 dark:text-slate-400 max-w-xs mx-auto">
                  Authentication is required. Access is safeguarded for active fleet runner delivery desks.
                </p>
              </div>

              {adminError && (
                <div className="text-center text-[10px] text-red-650 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 py-2.5 rounded font-bold px-2 uppercase tracking-wide">
                  {adminError}
                </div>
              )}

              <form onSubmit={handleVerifyAdminPasscode} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 pl-1">ENTER PASSCODE</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-850 rounded-xl text-center font-bold tracking-wider outline-none focus:ring-2 focus:ring-[#0B6B3A]/20"
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.location.href = '/'}
                    className="flex-1 py-3 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-880 text-xs font-black uppercase text-gray-505 dark:text-slate-400 rounded-xl transition cursor-pointer"
                  >
                    Back to App
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#0B6B3A] hover:bg-[#09572E] text-white text-xs font-black uppercase rounded-xl transition cursor-pointer shadow-sm"
                  >
                    Authenticate
                  </button>
                </div>
              </form>
            </div>
          </main>

          {/* Toast System */}
          {toasts.length > 0 && (
            <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 max-w-sm w-full p-4 pointer-events-none">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`p-4 bg-white/95 dark:bg-slate-900/95 rounded-xl shadow-xl border border-gray-150 dark:border-slate-800 backdrop-blur-md pointer-events-auto flex items-center justify-between gap-3 ${
                    toast.type === 'success' ? 'border-l-4 border-l-[#0B6B3A]' : 'border-l-4 border-l-[#F4B400]'
                  }`}
                >
                  <div className="text-xs font-bold text-gray-800 dark:text-slate-100 leading-normal">
                    {toast.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return <>{element}</>;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col justify-between pb-28 font-sans transition-colors duration-200">
      
      {/* Dynamic Header */}
      <Header 
        isAdmin={isAdminVerified && (location.pathname === '/admin' || location.pathname === '/runner')} 
        darkMode={darkMode}
        onThemeToggle={() => setDarkMode(prev => !prev)}
        showAdminExit={location.pathname === '/admin' || location.pathname === '/runner'}
        onAdminToggle={handleExitAdmin}
      />

      <main className="container mx-auto max-w-4xl px-4 py-6 flex-grow pb-12">
        
        {/* Loader while synchronizing */}
        {syncLoading && allErrands.length === 0 && (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-4 border-[#0B6B3A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Connecting to logistics node...
            </p>
          </div>
        )}

        <Routes>
          {/* Student Routes */}
          <Route path="/" element={
            <StudentDashboard
              allErrands={allErrands}
              runnerStatus={runnerStatus}
              onCreateOrder={handleCreateOrder}
              submittingNote={submittingNote}
              profileName={profileName}
              profilePhone={profilePhone}
              onUpdateProfile={(name, phone) => {
                setProfileName(name);
                setProfilePhone(phone);
                localStorage.setItem('cr-profile-name', name);
                localStorage.setItem('cr-profile-phone', phone);
              }}
              recentOrderIds={recentOrderIds}
              onSelectErrand={setSelectedErrandId}
              addToast={addToast}
            />
          } />

          <Route path="/create" element={
            <CreateErrand
              onSubmit={(data) => {
                handleCreateOrder(data);
              }}
              onCancel={() => window.location.href = '/'}
              loading={submittingNote}
              initialFullName={profileName}
              initialPhoneNumber={profilePhone}
            />
          } />

          <Route path="/track" element={
            <OrderTracking
              errand={selectedErrand || allErrands[0]}
              onBack={() => window.location.href = '/'}
            />
          } />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminRoute element={
              <AdminDashboard 
                errands={allErrands} 
                runnerPhone="0700891519"
                runnerStatus={runnerStatus}
                onUpdateRunnerStatus={handleUpdateRunnerStatus}
              />
            } />
          } />

          <Route path="/runner" element={
            <AdminRoute element={
              <RunnerDashboard 
                errands={allErrands} 
                runnerPhone="0700891519"
                runnerStatus={runnerStatus}
                onUpdateRunnerStatus={handleUpdateRunnerStatus}
              />
            } />
          } />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Dynamic Toast System */}
      {toasts.length > 0 && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 max-w-sm w-full p-4 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 bg-white/95 dark:bg-slate-900/95 rounded-xl shadow-xl border border-gray-150 dark:border-slate-800 backdrop-blur-md pointer-events-auto flex items-center justify-between gap-3 ${
                toast.type === 'success' ? 'border-l-4 border-l-[#0B6B3A]' : 'border-l-4 border-l-[#F4B400]'
              }`}
            >
              <div className="text-xs font-bold text-gray-800 dark:text-slate-100 leading-normal">
                {toast.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Navigation - Only on home route */}
      {location.pathname === '/' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-150 dark:border-slate-800 z-50 transition-colors duration-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
            <button
              onClick={() => window.location.href = '/'}
              className={`flex flex-col items-center justify-center gap-1.5 h-full flex-1 transition cursor-pointer ${
                location.pathname === '/'
                  ? 'text-[#0B6B3A] dark:text-[#32b56e]'
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-wider">Home</span>
            </button>

            <button
              onClick={() => window.location.href = '/track'}
              className={`flex flex-col items-center justify-center gap-1.5 h-full flex-1 transition cursor-pointer ${
                location.pathname === '/track'
                  ? 'text-[#0B6B3A] dark:text-[#32b56e]'
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400'
              }`}
            >
              <Search className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-wider">Track Order</span>
            </button>

            <button
              onClick={() => window.location.href = '/#profile'}
              className={`flex flex-col items-center justify-center gap-1.5 h-full flex-1 transition cursor-pointer ${
                location.pathname.includes('profile')
                  ? 'text-[#0B6B3A] dark:text-[#32b56e]'
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-wider">Account</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default App;

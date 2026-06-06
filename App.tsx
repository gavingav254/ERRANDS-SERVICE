import React, { useState, useEffect } from 'react';
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
  // Navigation Tabs: 'home' | 'track' | 'profile'
  const [activeTab, setActiveTab] = useState<'home' | 'track' | 'profile'>('home');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Parse path and hash to allow /admin or /runner routes and preserve state
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname + window.location.hash);
  const [isAdminVerified, setIsAdminVerified] = useState(() => {
    return sessionStorage.getItem('cr-admin-verified') === 'true';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname + window.location.hash);
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const isAdminRoute = currentPath.includes('/admin') || currentPath.includes('/runner') || currentPath.includes('#/admin') || currentPath.includes('#/runner');
  const isAdmin = isAdminRoute && isAdminVerified;

  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminError, setAdminError] = useState('');

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
  
  // Real-time synced errands list (Entire collections database synchronized in real-time!)
  const [allErrands, setAllErrands] = useState<Errand[]>([]);
  const [syncLoading, setSyncLoading] = useState(true);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Recent Placed Order Reference IDs preserved locally
  const [recentOrderIds, setRecentOrderIds] = useState<string[]>([]);

  // Simple Notification Alerts state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'info' }[]>([]);

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
      setActiveTab('track');
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
    // Clear administrators path / hashes
    window.location.hash = '';
    window.location.pathname = '/';
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

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col justify-between pb-28 font-sans transition-colors duration-200">
      
      {/* Dynamic Header */}
      <Header 
        isAdmin={isAdmin} 
        darkMode={darkMode}
        onThemeToggle={() => setDarkMode(prev => !prev)}
        showAdminExit={isAdminRoute}
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

        {/* --- MAIN PAGE VIEW ROUTER --- */}

        {isAdminRoute ? (
          /* RUNNER DASHBOARD (ADMIN LOGISTICS HUB) */
          !isAdminVerified ? (
            /* SECURE FULL-PAGE LOCK SCREEN */
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
                    onClick={() => {
                      window.location.hash = '';
                      window.location.pathname = '/';
                    }}
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
          ) : (
            currentPath.includes('/admin') || currentPath.includes('#/admin') ? (
              <AdminDashboard 
                errands={allErrands} 
                runnerPhone="0700891519" // Courier Office line
                runnerStatus={runnerStatus}
                onUpdateRunnerStatus={handleUpdateRunnerStatus}
              />
            ) : (
              <RunnerDashboard 
                errands={allErrands} 
                runnerPhone="0700891519" // Courier Office line
                runnerStatus={runnerStatus}
                onUpdateRunnerStatus={handleUpdateRunnerStatus}
              />
            )
          )
        ) : (
          /* STUDENT / ANONYMOUS VISITOR VIEWS */
          <div className="space-y-6">
            
            {/* Tab A: Home Tab */}
            {activeTab === 'home' && (
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
            )}

            {/* Tab B: Track Tab */}
            {activeTab === 'track' && (
              selectedErrandId && selectedErrand ? (
                <div className="animate-fade-in pb-12">
                  <OrderTracking
                    errand={selectedErrand}
                    onBack={() => {
                      setSelectedErrandId(null);
                    }}
                  />
                </div>
              ) : (
                <div className="max-w-md mx-auto bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-8 shadow-sm space-y-6 pb-6 animate-fade-in">
                  <div className="border-b border-gray-100 dark:border-slate-850 pb-3">
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-slate-1000">
                      Errand Retrieval Desk
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Enter the order number or client telephone number to pull active deliveries.
                    </p>
                  </div>

                  {/* Input Search Block */}
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-850 focus:ring-4 focus:ring-[#0B6B3A]/20 outline-none text-xs font-medium"
                        placeholder="e.g. CR-F2E1B or 0712345678"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute right-4 top-4" />
                    </div>

                    {searchQuery.trim() ? (
                      <div className="space-y-3.5 animate-in fade-in duration-200">
                        <h4 className="text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest pl-1">
                          Matching Logistics Records ({searchResults.length})
                        </h4>

                        {searchResults.length === 0 ? (
                          <div className="text-center py-8 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/40">
                            No orders found matching this query. Please check your reference inputs.
                          </div>
                        ) : (
                          <div className="border border-gray-150 dark:border-slate-800 rounded-xl divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                            {searchResults.map((errand) => (
                              <button
                                key={errand.id}
                                onClick={() => {
                                  setSelectedErrandId(errand.id);
                                }}
                                className="w-full px-4 py-4 hover:bg-gray-50 dark:hover:bg-slate-850 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 transition flex items-center justify-between"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-gray-900 dark:text-slate-100 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 border border-gray-255 dark:border-slate-755 rounded text-[8px]">
                                      {errand.orderId}
                                    </span>
                                    <span className="font-bold text-gray-800 dark:text-slate-202">{errand.category}</span>
                                  </div>
                                  <p className="text-gray-404 dark:text-slate-400 line-clamp-1 text-[11px] font-normal leading-relaxed">
                                    {errand.description}
                                  </p>
                                  <div className="text-[9px] text-gray-400 dark:text-slate-450 font-bold uppercase tracking-wide">
                                    By {errand.fullName} ({errand.phoneNumber}) &bull; Dest: {errand.location}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="block text-[8px] font-black uppercase text-gray-300 dark:text-slate-500 tracking-wider">Status:</span>
                                  <span className="inline-block mt-0.5 font-bold uppercase text-[9px] px-2 bg-[#0B6B3A]/10 text-[#0B6B3A] dark:text-[#32b56e] border border-[#0B6B3A]/20 dark:border-green-800/40 rounded">
                                    {errand.status}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      mappedRecentOrders.length > 0 && (
                        <div className="space-y-3.5 pt-2 animate-in fade-in duration-200">
                          <h4 className="text-[9px] font-black text-gray-405 dark:text-slate-450 uppercase tracking-widest pl-1">
                            Recently Placed Orders
                          </h4>
                          <div className="border border-gray-150 dark:border-slate-800 rounded-xl divide-y divide-gray-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                            {mappedRecentOrders.map((errand) => (
                              <button
                                key={errand.id}
                                onClick={() => {
                                  setSelectedErrandId(errand.id);
                                }}
                                className="w-full px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-850/50 text-left text-xs font-semibold text-gray-700 dark:text-slate-300 transition flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-gray-905 dark:text-slate-100 bg-gray-50 dark:bg-slate-804 px-2 py-0.5 border border-gray-200 dark:border-slate-700 rounded text-[8px]">
                                    {errand.orderId}
                                  </span>
                                  <span className="font-bold text-gray-800 dark:text-slate-202">{errand.category} &bull; Dest: {errand.location}</span>
                                </div>
                                <span className="font-bold uppercase text-[9px] px-2 bg-[#0B6B3A]/10 text-[#0B6B3A] dark:text-[#32b56e] rounded border border-[#0B6B3A]/10">
                                  {errand.status}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            )}

            {/* Tab C: Account Tab */}
            {activeTab === 'profile' && (
              <div className="max-w-md mx-auto space-y-6 animate-fade-in">
                {/* Profile contact options */}
                <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="border-b border-gray-100 dark:border-slate-800 pb-3">
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-slate-100">
                      Customer Profile
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      Configure pre-filled details for simple checkout flow.
                    </p>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      localStorage.setItem('cr-profile-name', profileName.trim());
                      localStorage.setItem('cr-profile-phone', profilePhone.trim());
                      addToast('Pre-fill details saved successfully!', 'success');
                    }} 
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 pl-0.5">Your Full Name</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-850 outline-none text-xs font-medium"
                        placeholder="e.g. Kelvin Kipkosgei"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 pl-0.5">M-Pesa Mobile Number</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-850 outline-none text-xs font-medium"
                        placeholder="e.g. 0712345678"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-[#0B6B3A] hover:bg-[#09572E] text-white dark:bg-[#32b56e] dark:hover:bg-[#289255] text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm"
                    >
                      Save Pre-fill Card
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
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

      {/* Persistent Bottom Tab Navigation Bar */}
      {!isAdminRoute && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-150 dark:border-slate-800 z-50 transition-colors duration-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
            <button
              onClick={() => {
                setActiveTab('home');
                setIsPlacingOrder(false);
              }}
              className={`flex flex-col items-center justify-center gap-1.5 h-full flex-1 transition cursor-pointer ${
                activeTab === 'home'
                  ? 'text-[#0B6B3A] dark:text-[#32b56e]'
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-wider">Home</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('track');
              }}
              className={`flex flex-col items-center justify-center gap-1.5 h-full flex-1 transition cursor-pointer ${
                activeTab === 'track'
                  ? 'text-[#0B6B3A] dark:text-[#32b56e]'
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400'
              }`}
            >
              <Search className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-wider">Track Order</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('profile');
              }}
              className={`flex flex-col items-center justify-center gap-1.5 h-full flex-1 transition cursor-pointer ${
                activeTab === 'profile'
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

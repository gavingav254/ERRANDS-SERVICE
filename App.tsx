
import React, { useState, useEffect, useCallback } from 'react';
import { Errand, Coords, TransportMode } from './types';
import Header from './components/Header';
import OrderForm from './components/OrderForm';
import RunnerDashboard from './components/RunnerDashboard';
import TrackingMap from './components/TrackingMap';
import Auth from './components/Auth';

const App: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);
  const [view, setView] = useState<'student' | 'runner'>('student');
  const [errands, setErrands] = useState<Errand[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedErrands = localStorage.getItem('embu-errands');
    const savedUser = localStorage.getItem('embu-user');
    
    if (savedErrands) setErrands(JSON.parse(savedErrands));
    if (savedUser) setUser(savedUser);
    
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) {
      localStorage.setItem('embu-errands', JSON.stringify(errands));
    }
  }, [errands, isReady]);

  const handleLogin = (email: string) => {
    setUser(email);
    localStorage.setItem('embu-user', email);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('embu-user');
  };

  const handleOrderPlaced = (newErrand: Errand) => {
    setErrands(prev => [newErrand, ...prev]);
  };

  const handleCompleteErrand = (id: string) => {
    setErrands(prev => prev.map(e => 
      e.id === id ? { ...e, status: 'Completed', runnerCoords: undefined, runnerSpeed: undefined, runnerAccuracy: undefined, transportMode: undefined, eta: undefined } : e
    ));
  };

  const handleStartErrand = (id: string) => {
    setErrands(prev => prev.map(e => 
      e.id === id ? { ...e, status: 'Active' } : e
    ));
  };

  const handleUpdateLocation = useCallback((id: string, coords: Coords, speed: number | null, accuracy: number | null, mode: TransportMode, eta: string) => {
    setErrands(prev => prev.map(e => 
      e.id === id ? { ...e, runnerCoords: coords, runnerSpeed: speed ?? undefined, runnerAccuracy: accuracy ?? undefined, transportMode: mode, eta } : e
    ));
  }, []);

  if (!isReady) return null;

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const activeErrandForStudent = errands.find(e => e.status === 'Active' || (e.status === 'Pending' && e.runnerCoords));

  const getTransportIcon = (mode?: TransportMode) => {
    switch (mode) {
      case 'Bike': return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
      );
      case 'PSV': return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
      );
      default: return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header 
        view={view} 
        setView={setView} 
        userEmail={user} 
        onLogout={handleLogout} 
      />
      
      <main className="container mx-auto max-w-4xl pt-4">
        {view === 'student' ? (
          <div className="space-y-8">
            <div className="text-center px-4 mt-8">
              <h2 className="text-4xl font-black text-embu-green leading-tight tracking-tighter uppercase">
                ERRANDS <span className="text-embu-gold">SERVICE</span>
              </h2>
              <p className="text-gray-400 mt-2 max-w-md mx-auto text-xs font-bold uppercase tracking-widest">
                Reliable Campus Logistics for University of Embu
              </p>
            </div>
            
            {activeErrandForStudent ? (
              <section className="px-4 animate-in fade-in slide-in-from-top duration-500">
                <div className="bg-embu-green text-white rounded-[2.5rem] p-8 shadow-2xl border-4 border-embu-gold overflow-hidden relative">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-embu-gold text-embu-green px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Live Tracking
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-embu-gold">
                            {getTransportIcon(activeErrandForStudent.transportMode)}
                            {activeErrandForStudent.transportMode || 'Walking'}
                          </span>
                        </div>
                        <h3 className="text-2xl font-black mt-2">Coming from {activeErrandForStudent.source}</h3>
                        <p className="text-sm opacity-80 font-bold mt-1">Item: {activeErrandForStudent.item}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] opacity-70 uppercase font-black tracking-widest">Arrival In</div>
                        <div className="text-3xl font-black text-embu-gold">{activeErrandForStudent.eta || 'Active'}</div>
                      </div>
                    </div>
                    
                    {activeErrandForStudent.runnerCoords ? (
                      <TrackingMap 
                        runnerCoords={activeErrandForStudent.runnerCoords} 
                        destCoords={activeErrandForStudent.destinationCoords}
                        destinationName={activeErrandForStudent.location}
                        runnerSpeed={activeErrandForStudent.runnerSpeed}
                        runnerAccuracy={activeErrandForStudent.runnerAccuracy}
                        transportMode={activeErrandForStudent.transportMode}
                      />
                    ) : (
                      <div className="h-64 bg-white/5 rounded-3xl flex items-center justify-center border-2 border-dashed border-white/10 backdrop-blur-sm">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-embu-gold/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                             <svg className="w-8 h-8 text-embu-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                             </svg>
                          </div>
                          <p className="text-sm font-bold opacity-60">Initializing Satellite Uplink...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : (
              <section className="px-4">
                 <div className="bg-white rounded-[2.5rem] p-4 shadow-xl border border-gray-100 overflow-hidden">
                    <TrackingMap isOverview={true} />
                    <div className="px-4 py-3 flex justify-between items-center bg-gray-50/50 rounded-2xl mt-4">
                       <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Campus Status</p>
                          <p className="text-xs font-bold text-embu-green">University of Embu Grounds</p>
                       </div>
                       <div className="flex gap-2">
                          <div className="px-2 py-1 rounded-lg bg-embu-gold/10 border border-embu-gold/30 text-[8px] font-black text-embu-green uppercase">12 Active Runners</div>
                       </div>
                    </div>
                 </div>
              </section>
            )}

            <OrderForm onOrderPlaced={handleOrderPlaced} defaultName={user.split('@')[0]} />
            
            <section className="px-4 pb-12">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Recent Errands</h3>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Live Feed</span>
                </div>
              </div>
              
              {errands.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100 text-gray-400">
                   <p className="font-bold uppercase tracking-widest text-[10px]">Your history is clear. Post an errand above!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {errands.slice(0, 10).map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col group hover:border-embu-green transition-all hover:shadow-xl hover:shadow-embu-green/5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                            order.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-embu-gold/20 text-embu-green'
                          }`}>
                            {order.item[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="font-black text-gray-800 text-lg group-hover:text-embu-green transition-colors">{order.item}</div>
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">
                                By {order.studentName}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">
                              From: <span className="text-gray-600">{order.source}</span> &bull; To: <span className="text-gray-600">{order.location}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end sm:gap-6 pt-4 sm:pt-0 border-t sm:border-0 border-gray-50">
                          <div className="text-left sm:text-right">
                            <div className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full inline-block ${
                              order.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                              order.status === 'Active' ? 'bg-blue-100 text-blue-700' : 
                              'bg-embu-gold/30 text-embu-green'
                            }`}>
                              {order.status}
                            </div>
                            <div className="text-xs font-bold text-gray-400 mt-1">{new Date(order.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                          <div className="text-xl font-black text-gray-800">KES {order.price}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <RunnerDashboard 
            errands={errands} 
            onComplete={handleCompleteErrand}
            onUpdateLocation={handleUpdateLocation}
            onStartErrand={handleStartErrand}
          />
        )}
      </main>

      <footer className="fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 py-4 text-center text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] z-40">
        &bull; ERRANDS SERVICE EMBU &bull; SESSION: {user} &bull;
      </footer>
    </div>
  );
};

export default App;


import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Errand, Coords, TransportMode } from '../types';

interface RunnerDashboardProps {
  errands: Errand[];
  onComplete: (id: string) => void;
  onUpdateLocation: (id: string, coords: Coords, speed: number | null, accuracy: number | null, mode: TransportMode, eta: string) => void;
  onStartErrand: (id: string) => void;
}

const RunnerDashboard: React.FC<RunnerDashboardProps> = ({ errands, onComplete, onUpdateLocation, onStartErrand }) => {
  const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('Walking');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Use a ref to store latest transport mode to avoid stale closures in geolocation watcher
  const transportModeRef = useRef<TransportMode>('Walking');
  useEffect(() => {
    transportModeRef.current = transportMode;
  }, [transportMode]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const pendingErrands = useMemo(() => 
    errands.filter(e => e.status !== 'Completed'), 
    [errands]
  );

  useEffect(() => {
    let watchId: number;

    if (activeTrackingId) {
      if ('geolocation' in navigator) {
        setGpsError(null);
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const coords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            setGpsError(null);
            const speed = position.coords.speed;
            const accuracy = position.coords.accuracy;
            
            setCurrentSpeed(speed);
            setCurrentAccuracy(accuracy);
            
            onUpdateLocation(activeTrackingId, coords, speed, accuracy, transportModeRef.current, 'Active');
          },
          (error) => {
            console.error("GPS Error:", error);
            if (error.code === error.PERMISSION_DENIED) {
              setGpsError("Location access denied.");
            } else {
              setGpsError("GPS position unavailable.");
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        setGpsError("Your browser does not support geolocation tracking.");
      }
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [activeTrackingId, onUpdateLocation]);

  const groupedErrands = useMemo(() => {
    const groups: Record<string, Errand[]> = {};
    pendingErrands.forEach(errand => {
      if (!groups[errand.location]) {
        groups[errand.location] = [];
      }
      groups[errand.location].push(errand);
    });
    return groups;
  }, [pendingErrands]);

  const formatWaitTime = (timestamp: number) => {
    const diffInMins = Math.floor((now - timestamp) / 60000);
    return diffInMins < 1 ? '< 1m' : `${diffInMins}m`;
  };

  const handleStart = (id: string) => {
    setActiveTrackingId(id);
    onStartErrand(id);
  };

  const handleFinish = (id: string) => {
    if (activeTrackingId === id) {
      setActiveTrackingId(null);
      setCurrentSpeed(null);
      setCurrentAccuracy(null);
      setGpsError(null);
    }
    onComplete(id);
  };

  const ModeIcon = ({ mode, className = "w-4 h-4" }: { mode: TransportMode, className?: string }) => {
    switch (mode) {
      case 'Walking': return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>;
      case 'Bike': return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
      case 'PSV': return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="bg-embu-green p-6 rounded-2xl text-white shadow-xl flex justify-between items-center relative overflow-hidden">
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white opacity-5 rounded-full" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">Runner Dashboard</h2>
          <p className="text-embu-gold font-medium">Logistics Console</p>
        </div>
        <div className="bg-white/10 p-3 rounded-xl border border-white/20 relative z-10 text-right min-w-[120px]">
          <div className="text-[10px] uppercase opacity-70 tracking-widest font-bold">
            {activeTrackingId ? `Mode: ${transportMode}` : 'Runner Status'}
          </div>
          <div className="flex items-center gap-2 text-sm font-bold justify-end mt-1">
            <div className={`w-2 h-2 rounded-full ${activeTrackingId ? 'bg-green-400 animate-pulse' : 'bg-embu-gold'}`} />
            {activeTrackingId ? (
              <span className="flex items-center gap-1.5">
                <ModeIcon mode={transportMode} className="w-4 h-4 text-embu-gold" />
                Live
              </span>
            ) : 'Waiting'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(groupedErrands).length === 0 ? (
          <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-400">
             <p className="font-bold uppercase tracking-widest text-[10px]">No active errands. Enjoy the break!</p>
          </div>
        ) : (
          (Object.entries(groupedErrands) as [string, Errand[]][]).map(([location, group]) => (
            <div key={location} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full hover:shadow-xl transition-shadow duration-300">
              <div className="bg-gray-50/50 px-6 py-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-embu-green truncate max-w-[150px]">{location}</h3>
                <span className="bg-embu-gold text-embu-green px-3 py-1 rounded-full text-[10px] font-black shadow-sm">
                  {group.length} TASK{group.length > 1 ? 'S' : ''}
                </span>
              </div>
              <ul className="divide-y flex-grow">
                {group.map(errand => (
                  <li key={errand.id} className={`p-6 transition-all ${activeTrackingId === errand.id ? 'bg-embu-green/5' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <div className="font-black text-gray-800 text-lg leading-tight">{errand.item}</div>
                        <div className="text-[10px] font-black text-embu-green uppercase tracking-widest mt-1">Requester: {errand.studentName}</div>
                      </div>
                      <div className="text-embu-green font-black">KES {errand.price}</div>
                    </div>
                    
                    {errand.status === 'Active' ? (
                      <div className="space-y-4">
                        <div className="bg-white border-2 border-embu-green/10 rounded-2xl p-4 shadow-inner">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-4 ml-1">Change Transport Mode</label>
                          <div className="grid grid-cols-3 gap-3">
                            {(['Walking', 'Bike', 'PSV'] as TransportMode[]).map(mode => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setTransportMode(mode)}
                                className={`py-4 px-2 rounded-2xl text-[10px] font-black uppercase flex flex-col items-center gap-2 transition-all border-2 active:scale-95 touch-manipulation ${
                                  transportMode === mode 
                                  ? 'bg-embu-green border-embu-green text-white shadow-xl shadow-embu-green/20' 
                                  : 'bg-gray-50 border-gray-50 text-gray-400 hover:border-gray-200'
                                }`}
                              >
                                <ModeIcon mode={mode} className="w-6 h-6" />
                                <span>{mode}</span>
                                {transportMode === mode && (
                                  <div className="w-1 h-1 bg-embu-gold rounded-full" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-3 text-center shadow-sm">
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">GPS Speed</div>
                            <div className="font-black text-embu-green text-base">
                              {currentSpeed !== null ? `${(currentSpeed * 3.6).toFixed(1)} km/h` : '0.0 km/h'}
                            </div>
                            {currentAccuracy !== null && (
                              <div className="text-[8px] font-bold text-gray-400 mt-1">
                                Accuracy: +/- {Math.round(currentAccuracy)}m
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleFinish(errand.id)}
                            className="flex-[2] py-4 bg-embu-green text-white rounded-2xl font-black text-sm shadow-lg hover:bg-embu-darkGreen active:scale-95 transition-all uppercase tracking-widest"
                          >
                            Mark Delivered
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStart(errand.id)}
                        disabled={!!activeTrackingId}
                        className={`w-full py-5 rounded-2xl font-black text-sm border-4 transition-all uppercase tracking-widest shadow-sm ${
                          activeTrackingId 
                          ? 'bg-gray-50 text-gray-300 border-gray-50 cursor-not-allowed' 
                          : 'bg-white border-embu-green text-embu-green hover:bg-embu-green hover:text-white active:scale-95'
                        }`}
                      >
                        Start Delivery
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RunnerDashboard;

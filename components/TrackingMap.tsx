
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Coords, TransportMode } from '../types';

// Access Leaflet from the window object since it's loaded via CDN
declare const L: any;

interface TrackingMapProps {
  runnerCoords?: Coords;
  runnerSpeed?: number;
  runnerAccuracy?: number;
  transportMode?: TransportMode;
  destCoords?: Coords;
  destinationName?: string;
  isOverview?: boolean;
}

const LANDMARKS = [
  { name: 'The Gate', lat: -0.5050, lng: 37.4580, type: 'Gate' },
  { name: 'New Library', lat: -0.5065, lng: 37.4595, type: 'Academic' },
  { name: 'Graduation Square', lat: -0.5070, lng: 37.4590, type: 'Hub' },
  { name: 'School of Agriculture', lat: -0.5080, lng: 37.4610, type: 'Academic' },
  { name: 'Hostel Ngiri', lat: -0.5100, lng: 37.4620, type: 'Hostel' },
  { name: 'Hostel Simba', lat: -0.5110, lng: 37.4625, type: 'Hostel' },
  { name: 'The Mess', lat: -0.5075, lng: 37.4600, type: 'Food' },
  { name: 'Science Labs', lat: -0.5060, lng: 37.4590, type: 'Academic' },
  { name: 'School of Nursing', lat: -0.5085, lng: 37.4615, type: 'Academic' },
  { name: 'Old Admin Block', lat: -0.5055, lng: 37.4585, type: 'Admin' }
];

const TrackingMap: React.FC<TrackingMapProps> = ({ 
  runnerCoords, 
  runnerSpeed, 
  runnerAccuracy, 
  transportMode = 'Walking', 
  destCoords, 
  destinationName,
  isOverview = false
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const runnerMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const landmarkGroupRef = useRef<any>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = runnerCoords 
      ? [runnerCoords.lat, runnerCoords.lng] 
      : [-0.5075, 37.4600]; // Center of Embu Uni

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(initialCenter, isOverview ? 16 : 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

    // Add Landmarks
    landmarkGroupRef.current = L.layerGroup().addTo(mapRef.current);
    LANDMARKS.forEach(landmark => {
      L.circleMarker([landmark.lat, landmark.lng], {
        radius: 4,
        fillColor: "#FFD700",
        color: "#006400",
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6
      })
      .bindTooltip(landmark.name, { 
        permanent: false, 
        direction: 'top', 
        className: 'embu-tooltip' 
      })
      .addTo(landmarkGroupRef.current);
    });

    if (runnerCoords) {
      runnerMarkerRef.current = L.circleMarker([runnerCoords.lat, runnerCoords.lng], {
        radius: 8,
        fillColor: "#006400",
        color: "#FFD700",
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      }).addTo(mapRef.current);

      runnerMarkerRef.current.bindPopup(`
        <div class="p-2 font-bold">
          <p class="text-embu-green uppercase text-[10px]">Runner Position</p>
          <p class="text-xs">Lat: ${runnerCoords.lat.toFixed(5)}</p>
          <p class="text-xs">Lng: ${runnerCoords.lng.toFixed(5)}</p>
          ${runnerAccuracy ? `<p class="text-[9px] text-gray-500">Accuracy: +/-${Math.round(runnerAccuracy)}m</p>` : ''}
        </div>
      `);

      if (runnerAccuracy) {
        accuracyCircleRef.current = L.circle([runnerCoords.lat, runnerCoords.lng], {
          radius: runnerAccuracy,
          color: '#006400',
          fillColor: '#006400',
          fillOpacity: 0.1,
          weight: 1
        }).addTo(mapRef.current);
      }
    }

    if (destCoords) {
      destMarkerRef.current = L.marker([destCoords.lat, destCoords.lng], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="animate-bounce" style="background-color: #FFD700; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #006400; box-shadow: 0 0 10px rgba(0,100,0,0.5);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        })
      }).addTo(mapRef.current);

      destMarkerRef.current.bindPopup(`
        <div class="p-2 font-bold">
          <p class="text-embu-green uppercase text-[10px]">Destination</p>
          <p class="text-xs">${destinationName || 'Drop-off Point'}</p>
        </div>
      `);
    }

    // Toggle details on map click
    mapRef.current.on('click', () => {
      if (!isOverview) setIsDetailsOpen(prev => !prev);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click');
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Route and Markers
  useEffect(() => {
    if (!mapRef.current || !runnerCoords) return;

    if (runnerMarkerRef.current) {
      runnerMarkerRef.current.setLatLng([runnerCoords.lat, runnerCoords.lng]);
      runnerMarkerRef.current.getPopup().setContent(`
        <div class="p-2 font-bold">
          <p class="text-embu-green uppercase text-[10px]">Runner Position</p>
          <p class="text-xs">Lat: ${runnerCoords.lat.toFixed(5)}</p>
          <p class="text-xs">Lng: ${runnerCoords.lng.toFixed(5)}</p>
          ${runnerAccuracy ? `<p class="text-[9px] text-gray-500">Accuracy: +/-${Math.round(runnerAccuracy)}m</p>` : ''}
        </div>
      `);
    }

    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng([runnerCoords.lat, runnerCoords.lng]);
      if (runnerAccuracy) accuracyCircleRef.current.setRadius(runnerAccuracy);
    }

    const fetchRoute = async () => {
      if (!destCoords) return;
      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${runnerCoords.lng},${runnerCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          setRouteDuration(data.routes[0].duration);
          if (routeLayerRef.current) routeLayerRef.current.remove();
          routeLayerRef.current = L.geoJSON(data.routes[0].geometry, {
            style: { color: '#006400', weight: 5, opacity: 0.4, dashArray: '8, 12' }
          }).addTo(mapRef.current);
        }
      } catch (err) {
        console.error("Routing error:", err);
      }
    };

    fetchRoute();
  }, [runnerCoords?.lat, runnerCoords?.lng, destCoords, runnerAccuracy]);

  const etaText = useMemo(() => {
    if (routeDuration === null) return 'Calculating...';
    const baselineWalkingSpeed = 1.39;
    const modeSpeedMap: Record<TransportMode, number> = {
      'Walking': 1.39,
      'Bike': 5.5,
      'PSV': 8.3
    };

    const targetSpeed = modeSpeedMap[transportMode];
    let effectiveDuration = routeDuration * (baselineWalkingSpeed / targetSpeed);
    
    if (runnerSpeed && runnerSpeed > 0.5) {
      const blendedSpeed = (runnerSpeed * 0.7) + (targetSpeed * 0.3);
      effectiveDuration = routeDuration * (baselineWalkingSpeed / blendedSpeed);
    }

    if (effectiveDuration < 30) return 'Arriving now';
    if (effectiveDuration < 60) return 'Under 1m';
    const mins = Math.floor(effectiveDuration / 60);
    return `${mins}m ${Math.round(effectiveDuration % 60)}s`;
  }, [routeDuration, runnerSpeed, transportMode]);

  return (
    <div className="relative group">
      <style>{`
        .embu-tooltip {
          background-color: #006400 !important;
          color: #FFD700 !important;
          border: 1px solid #FFD700 !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          font-size: 8px !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 1rem;
          padding: 0;
          border: 2px solid #FFD700;
        }
        .leaflet-popup-tip {
          background: #FFD700;
        }
      `}</style>
      
      <div className={`relative w-full ${isOverview ? 'h-48' : 'h-64'} bg-gray-200 rounded-3xl overflow-hidden border-2 border-embu-gold shadow-2xl transition-all duration-500`}>
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* Map Header Overlay */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
           <div className="bg-embu-green/90 backdrop-blur px-3 py-1.5 rounded-xl shadow-lg border border-embu-gold/50 text-[10px] font-black text-white flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-embu-gold animate-pulse" />
             {isOverview ? 'CAMPUS LOGISTICS MAP' : 'LIVE TRACKING'}
           </div>
        </div>

        {!isOverview && (
          <>
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
               <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-lg border border-embu-gold/50 text-[10px] font-black text-embu-green flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE GPS
               </div>
               {runnerAccuracy !== undefined && (
                 <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-lg border border-gray-100 text-[8px] font-black text-gray-500 text-center">
                   +/- {Math.round(runnerAccuracy)}m
                 </div>
               )}
            </div>

            <div 
              onClick={(e) => {
                e.stopPropagation();
                setIsDetailsOpen(!isDetailsOpen);
              }}
              className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur p-4 rounded-2xl border border-gray-100 shadow-2xl flex justify-between items-center z-[1000] cursor-pointer hover:bg-white transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-embu-green flex items-center justify-center text-embu-gold font-black shadow-inner">
                   {transportMode === 'Walking' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>}
                   {transportMode === 'Bike' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                   {transportMode === 'PSV' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2" /></svg>}
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Runner is {transportMode}</div>
                  <div className="text-sm font-black text-embu-green">{etaText}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black uppercase text-gray-300">Tap for details</span>
                <svg className={`w-5 h-5 text-embu-gold transition-transform duration-300 ${isDetailsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </div>
          </>
        )}
      </div>

      {!isOverview && isDetailsOpen && (
        <div className="mt-4 bg-white rounded-3xl border-2 border-embu-gold p-6 shadow-2xl animate-in slide-in-from-bottom-4">
           <div className="flex justify-between items-center mb-4">
              <h4 className="font-black text-embu-green text-lg uppercase tracking-tight">Trip Stats</h4>
              <span className="text-[10px] font-black uppercase text-embu-gold bg-embu-green px-2 py-1 rounded">Embu Uni Campus Map</span>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl text-center">
                 <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Travel Mode</div>
                 <div className="font-black text-embu-green">{transportMode}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl text-center">
                 <div className="text-[9px] font-black text-gray-400 uppercase mb-1">Live ETA</div>
                 <div className="font-black text-embu-green">{etaText}</div>
              </div>
              {runnerCoords && (
                 <div className="col-span-2 bg-gray-50 p-3 rounded-xl">
                   <div className="flex justify-between items-center">
                     <div>
                       <div className="text-[8px] font-black text-gray-400 uppercase mb-1">Last Contact</div>
                       <div className="text-xs font-black text-embu-green">Lat: {runnerCoords.lat.toFixed(4)}, Lng: {runnerCoords.lng.toFixed(4)}</div>
                     </div>
                     <div className="text-right">
                       <div className="text-[8px] font-black text-gray-400 uppercase mb-1">GPS Accuracy</div>
                       <div className="text-xs font-black text-embu-green">{runnerAccuracy ? `+/- ${Math.round(runnerAccuracy)}m` : 'Unknown'}</div>
                     </div>
                   </div>
                 </div>
              )}
           </div>
           <p className="mt-4 text-[9px] text-gray-400 font-bold text-center uppercase tracking-widest">Tap the markers on the map for location tags</p>
        </div>
      )}
    </div>
  );
};

export default TrackingMap;

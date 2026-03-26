
import React, { useState } from 'react';
import { parseErrandRequest } from '../services/geminiService';
import { Errand, Coords } from '../types';

interface OrderFormProps {
  onOrderPlaced: (errand: Errand) => void;
  defaultName: string;
}

const OrderForm: React.FC<OrderFormProps> = ({ onOrderPlaced, defaultName }) => {
  const [request, setRequest] = useState('');
  const [name, setName] = useState(''); 
  const [currentLocation, setCurrentLocation] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request.trim() || !currentLocation.trim() || !name.trim()) {
      setError('Please provide your name, location, and the item details.');
      return;
    }

    setIsLoading(true);
    setError('');

    let userCoords: Coords | undefined;
    
    // Try to get user location for better grounding
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      });
      userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
    } catch (geoErr) {
      console.warn("Could not get location for grounding:", geoErr);
    }

    try {
      const fullPrompt = `I am at ${currentLocation}. ${pickupPoint ? `Pick up from: ${pickupPoint}.` : ''} Request: ${request}`;
      const result = await parseErrandRequest(fullPrompt, userCoords);
      
      const baseFee = 30;
      const distanceFee = result.isCrossCampus ? 10 : 0;
      
      const newErrand: Errand = {
        id: Math.random().toString(36).substr(2, 9),
        studentName: name, 
        requestText: request,
        item: result.item,
        source: pickupPoint || result.source,
        location: currentLocation || result.location,
        pickupPoint: pickupPoint || undefined,
        zone: result.zone,
        price: baseFee + distanceFee,
        status: 'Pending',
        timestamp: Date.now(),
        isInternal: result.isInternal,
        notes: result.notes,
        destinationCoords: result.approxDestinationCoords,
        groundingLinks: result.groundingLinks
      };

      onOrderPlaced(newErrand);
      setRequest('');
      setCurrentLocation('');
      setPickupPoint('');
      setName(''); 
      alert(`Order placed! Please pay for the items via M-PESA to 0700891519. Delivery fee of KES ${newErrand.price} will be charged later.`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="p-6 bg-white rounded-3xl shadow-xl border border-gray-100 max-w-2xl mx-auto mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-embu-gold/20 rounded-2xl flex items-center justify-center text-embu-green">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
           </svg>
        </div>
        <div>
          <h2 className="text-xl font-black text-embu-green uppercase tracking-tight">Post Errand</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Fast Campus Delivery</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-embu-gold/10 rounded-2xl border-2 border-embu-gold/30">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-embu-green" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
            <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-black text-embu-green uppercase tracking-widest">Payment Instruction</span>
        </div>
        <p className="text-sm font-bold text-gray-800">
          Send money for your items to <span className="text-embu-green underline">0700891519</span>. 
          The delivery fee will be collected upon arrival.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                Requester Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Name"
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-embu-green/10 focus:border-embu-green outline-none transition-all text-gray-800 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
                Pickup Point (Optional)
              </label>
              <input
                type="text"
                value={pickupPoint}
                onChange={(e) => setPickupPoint(e.target.value)}
                placeholder="e.g. Science Lab Block C, Room 101"
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-embu-green/10 focus:border-embu-green outline-none transition-all text-gray-800 font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
              Your Current Location (Drop-off)
            </label>
            <input
              type="text"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="e.g. School of Nursing, Room 12"
              className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-embu-green/10 focus:border-embu-green outline-none transition-all text-gray-800 font-bold md:h-[calc(100%-1.5rem)]"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">
            What do you need? (Details)
          </label>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="e.g., Bring me a cold soda and fries"
            className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:ring-4 focus:ring-embu-green/10 focus:border-embu-green outline-none transition-all text-gray-800 font-medium h-24 resize-none"
            required
          />
        </div>

        {error && <p className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-5 rounded-2xl font-black text-lg shadow-2xl transition-all ${
            isLoading 
            ? 'bg-gray-100 cursor-not-allowed text-gray-300' 
            : 'bg-embu-green hover:bg-embu-darkGreen text-white active:scale-[0.98] shadow-embu-green/30'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : 'ORDER NOW'}
        </button>
      </form>
      
      <div className="mt-6 pt-6 border-t border-gray-100 flex justify-center gap-6 text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">
        <span className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-embu-gold" /> Standard: 30 KES
        </span>
        <span className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-embu-green" /> Long Haul: +10 KES
        </span>
      </div>
    </section>
  );
};

export default OrderForm;

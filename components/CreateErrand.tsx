import React, { useState } from 'react';
import { ErrandCategory, ErrandUrgency, PaymentMethod } from '../types';
import { Utensils, Cookie, ShoppingBag, Printer, Smartphone, Box, Clock, Fuel, Sparkles, Send, Info } from 'lucide-react';

interface CreateErrandProps {
  onSubmit: (errandData: {
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
  }) => void;
  onCancel: () => void;
  loading: boolean;
  initialFullName?: string;
  initialPhoneNumber?: string;
}

const CreateErrand: React.FC<CreateErrandProps> = ({ onSubmit, onCancel, loading, initialFullName = '', initialPhoneNumber = '' }) => {
  const [fullName, setFullName] = useState(initialFullName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);

  React.useEffect(() => {
    if (initialFullName) {
      setFullName(initialFullName);
    }
  }, [initialFullName]);

  React.useEffect(() => {
    if (initialPhoneNumber) {
      setPhoneNumber(initialPhoneNumber);
    }
  }, [initialPhoneNumber]);
  const [category, setCategory] = useState<ErrandCategory>('Food');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [urgency, setUrgency] = useState<ErrandUrgency>('Normal');
  const [deliveryZone, setDeliveryZone] = useState<'Campus Delivery' | 'Outside Campus Delivery'>('Campus Delivery');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash on Delivery');
  const [error, setError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  // 1. Dynamic Delivery Fee based on Delivery Zone and Budget/Item value
  const parsedBudget = budget.trim() ? parseFloat(budget) : 0;
  const deliveryFee = deliveryZone === 'Outside Campus Delivery'
    ? 100
    : (() => {
        if (parsedBudget < 200) return 20;
        if (parsedBudget <= 500) return 40;
        return 50;
      })();
  const totalCostEstimate = parsedBudget + deliveryFee;

  const categoriesList: { value: ErrandCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'Food', label: 'Food', icon: Utensils },
    { value: 'Snacks', label: 'Snacks', icon: Cookie },
    { value: 'Groceries', label: 'Groceries', icon: ShoppingBag },
    { value: 'Printing', label: 'Printing', icon: Printer },
    { value: 'Airtime', label: 'Airtime', icon: Smartphone },
    { value: 'Other', label: 'Other', icon: Box },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please provide your name');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Please provide your phone number');
      return;
    }
    if (!description.trim()) {
      setError('Please describe what you need');
      return;
    }
    if (!location.trim()) {
      setError('Please enter delivery location');
      return;
    }

    const calculatedBudget = budget.trim() ? parseFloat(budget) : null;
    if (calculatedBudget !== null && (isNaN(calculatedBudget) || calculatedBudget < 0)) {
      setError('Please enter a valid budget amount or keep it blank');
      return;
    }

    onSubmit({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      category,
      description: description.trim(),
      location: location.trim(),
      budget: calculatedBudget,
      urgency,
      paymentMethod,
      notes: notes.trim() || null,
      estimatedFee: deliveryFee,
      deliveryZone,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-800 p-6 max-w-lg mx-auto shadow-sm transition-colors duration-200">
      <div className="border-b border-gray-100 dark:border-slate-800 pb-4 mb-6">
        <h2 className="text-xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
          What do you need?
        </h2>
        <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 font-semibold">
          Fill in the details below, and an active runner will get it for you.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold p-4 rounded-xl mb-6 animate-in fade-in duration-150">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Guest Credentials block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider mb-1.5 pl-1">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-850 focus:ring-4 focus:ring-[#0B6B3A]/5 focus:border-[#0B6B3A] dark:focus:border-[#32b56e] text-sm outline-none font-bold text-gray-800 dark:text-white transition-all placeholder:text-gray-300 dark:placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider mb-1.5 pl-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 0712345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-850 focus:ring-4 focus:ring-[#0B6B3A]/5 focus:border-[#0B6B3A] dark:focus:border-[#32b56e] text-sm outline-none font-bold text-gray-800 dark:text-white transition-all placeholder:text-gray-300 dark:placeholder:text-slate-500 font-mono"
            />
          </div>
        </div>

        {/* Categories Quick Selectors Grid */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider mb-2 pl-1">
            Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {categoriesList.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`py-3.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#0B6B3A] bg-[#0B6B3A]/5 text-[#0B6B3A] dark:border-[#32b56e] dark:bg-[#32b56e]/5 dark:text-[#32b56e]'
                      : 'border-gray-200 hover:border-gray-350 bg-gray-50/50 dark:bg-slate-800/40 dark:border-slate-750 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-extrabold tracking-tight uppercase">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Errand specifications details */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider mb-1.5 pl-1">
            Items list <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder={`e.g. A cold soda, some fries, and fresh milk...`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-850 focus:ring-4 focus:ring-[#0B6B3A]/5 focus:border-[#0B6B3A] dark:focus:border-[#32b56e] text-sm outline-none font-semibold text-gray-800 dark:text-white transition-all resize-none placeholder:text-gray-300 dark:placeholder:text-slate-500 leading-relaxed"
          />
        </div>

        {/* Optional Shopping Budget cost */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider mb-1.5 pl-1">
            Estimated cost of items (KSh, optional)
          </label>
          <input
            type="number"
            min="0"
            placeholder="e.g. 200 (How much do the items cost?)"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-850 focus:ring-4 focus:ring-[#0B6B3A]/5 focus:border-[#0B6B3A] dark:focus:border-[#32b56e] text-sm outline-none font-bold text-gray-800 dark:text-white transition-all placeholder:text-gray-300 dark:placeholder:text-slate-500 font-mono"
          />
        </div>

        {/* Deliver Place */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider mb-1.5 pl-1">
            Where should we bring this? <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Hostel 10 Room B or Science Lab"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-850 focus:ring-4 focus:ring-[#0B6B3A]/5 focus:border-[#0B6B3A] dark:focus:border-[#32b56e] text-sm outline-none font-bold text-gray-800 dark:text-white transition-all placeholder:text-gray-300 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Delivery Zone selection */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider mb-2 pl-1">
            Delivery Zone
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryZone('Campus Delivery')}
              className={`py-3.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                deliveryZone === 'Campus Delivery'
                  ? 'border-[#0B6B3A] bg-[#0B6B3A]/5 text-[#0B6B3A] dark:border-[#32b56e] dark:bg-[#32b56e]/5 dark:text-[#32b56e]'
                  : 'border-gray-250 dark:border-slate-750 text-gray-500 hover:border-gray-300 dark:hover:border-slate-650 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-350'
              }`}
            >
              <div className="font-extrabold uppercase tracking-wider">Campus Delivery</div>
              <div className="text-[10px] font-semibold text-gray-400 dark:text-slate-450 mt-0.5">KSh 50 Delivery Fee</div>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryZone('Outside Campus Delivery')}
              className={`py-3.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                deliveryZone === 'Outside Campus Delivery'
                  ? 'border-[#0B6B3A] bg-[#0B6B3A]/5 text-[#0B6B3A] dark:border-[#32b56e] dark:bg-[#32b56e]/5 dark:text-[#32b56e]'
                  : 'border-gray-250 dark:border-slate-750 text-gray-500 hover:border-gray-300 dark:hover:border-slate-650 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-350'
              }`}
            >
              <div className="font-extrabold uppercase tracking-wider">Outside Campus</div>
              <div className="text-[10px] font-semibold text-gray-400 dark:text-slate-450 mt-0.5">KSh 100 Delivery Fee</div>
            </button>
          </div>
        </div>

        {/* Order Notes / Instructions (Optional) */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 dark:text-slate-450 uppercase tracking-wider mb-1.5 pl-1">
            Additional Instructions (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Call when outside, roommate will receive, Deliver to gate"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-850 focus:ring-4 focus:ring-[#0B6B3A]/5 focus:border-[#0B6B3A] dark:focus:border-[#32b56e] text-sm outline-none font-bold text-gray-800 dark:text-white transition-all placeholder:text-gray-300 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Payment Select Settlement */}
        <div>
          <span className="block text-[11px] font-bold text-gray-400 dark:text-slate-450 tracking-wider uppercase mb-2 pl-1">
            Payment Method
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('Cash on Delivery')}
              className={`py-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                paymentMethod === 'Cash on Delivery'
                  ? 'border-[#0B6B3A] bg-[#0B6B3A]/5 text-[#0B6B3A] dark:border-[#32b56e] dark:bg-[#32b56e]/5 dark:text-[#32b56e]'
                  : 'border-gray-250 dark:border-slate-750 text-gray-500 hover:border-gray-350 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-350'
              }`}
            >
              <div className="font-extrabold uppercase tracking-wider">Cash on Delivery</div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('M-Pesa')}
              className={`py-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                paymentMethod === 'M-Pesa'
                  ? 'border-[#0B6B3A] bg-[#0B6B3A]/5 text-[#0B6B3A] dark:border-[#32b56e] dark:bg-[#32b56e]/5 dark:text-[#32b56e] font-black'
                  : 'border-gray-250 dark:border-slate-750 text-gray-500 hover:border-gray-350 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-350'
              }`}
            >
              <div className="font-extrabold uppercase tracking-wider">M-Pesa</div>
            </button>
          </div>
        </div>

        {paymentMethod === 'M-Pesa' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500/25 p-4 rounded-xl space-y-1.5 animate-in slide-in-from-top-2 duration-150 text-xs">
            <p className="text-[#0B6B3A] dark:text-[#32b56e] font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified M-Pesa Destination
            </p>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-semibold">
              Payment will be processed via standard Lipa na M-Pesa to our verified receiver <strong className="text-slate-900 dark:text-white select-all font-mono font-black border-b border-dashed border-emerald-500 pb-0.5">0700891519</strong> (Name: <strong className="text-slate-950 dark:text-white font-black">WAITHERA</strong>).
            </p>
          </div>
        )}

        {/* Live Bill Estimates Panel */}
        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-gray-150 dark:border-slate-850/80 space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-650 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span>Estimated Delivery Fee</span>
              <span className="relative inline-block leading-none">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onClick={() => setShowTooltip(!showTooltip)}
                  className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-350 transition-colors p-0.5 rounded cursor-pointer leading-none relative z-10"
                  aria-label="Delivery fee details"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                {showTooltip && (
                  <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 border border-slate-800 dark:bg-slate-950 dark:border-slate-850 p-3.5 rounded-xl shadow-xl text-[11px] text-slate-300 font-medium leading-relaxed block animate-in fade-in-5 zoom-in-95 duration-150">
                    <span className="font-extrabold text-white text-xs mb-1.5 flex items-center gap-1 border-b border-slate-800 pb-1.5 block">
                      Transparent Pricing
                    </span>
                    <span className="space-y-2.5 block text-left">
                       <span className="block">
                         <strong className="font-extrabold text-[#F4B400] block mb-0.5 font-mono">Campus Zone Delivery</strong>
                         <span className="text-slate-400 block pl-1">
                           • Under KSh 200 → Fee: <strong className="text-white">KSh 20</strong><br/>
                           • KSh 200–500 → Fee: <strong className="text-white">KSh 40</strong><br/>
                           • Above KSh 500 → Fee: <strong className="text-white">KSh 50</strong>
                         </span>
                       </span>
                       <span className="block">
                         <strong className="font-extrabold text-[#F4B400] block mb-0.5 font-mono">Outside Campus Zone</strong>
                         <span className="text-slate-400 block pl-1 flex justify-between pr-2">
                           <span>• Flat Service Fee:</span> <strong className="text-white">KSh 100</strong>
                         </span>
                       </span>
                    </span>
                    {/* Tooltip arrow */}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-950 block"></span>
                  </span>
                )}
              </span>
            </span>
            <span className="font-mono font-black text-slate-800 dark:text-white">KSh {deliveryFee}</span>
          </div>
          <div className="flex justify-between items-center pt-2.5 border-t border-gray-200 dark:border-slate-800">
            <span className="text-xs font-black text-gray-900 dark:text-slate-100 uppercase">Estimated Total</span>
            <span className="text-base font-mono font-black text-[#0B6B3A] dark:text-[#32b56e]">
              KSh {totalCostEstimate}
            </span>
          </div>
        </div>

        {/* Submission actions */}
        <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-4 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-4 bg-[#0B6B3A] text-white hover:bg-[#09572E] text-xs font-bold uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-[#0B6B3A]/20"
          >
            <Send className="w-4 h-4 shrink-0" />
            {loading ? 'Sending...' : 'Confirm and Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateErrand;

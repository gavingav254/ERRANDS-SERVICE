import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Errand } from '../types';
import CreateErrand from './CreateErrand';
import { History, Home, PlusCircle } from 'lucide-react';

interface StudentDashboardProps {
  allErrands: Errand[];
  runnerStatus: 'Available' | 'Busy' | 'Offline';
  onCreateOrder: (data: any) => Promise<void>;
  submittingNote: boolean;
  profileName: string;
  profilePhone: string;
  onUpdateProfile: (name: string, phone: string) => void;
  recentOrderIds: string[];
  onSelectErrand: (id: string) => void;
  addToast: (message: string, type: 'success' | 'info') => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  allErrands,
  runnerStatus,
  onCreateOrder,
  submittingNote,
  profileName,
  profilePhone,
  onUpdateProfile,
  recentOrderIds,
  onSelectErrand,
  addToast,
}) => {
  const navigate = useNavigate();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [tempProfileName, setTempProfileName] = useState(profileName);
  const [tempProfilePhone, setTempProfilePhone] = useState(profilePhone);

  const mappedRecentOrders = allErrands.filter((errand) =>
    errand && errand.orderId && recentOrderIds.includes(errand.orderId)
  );

  if (isPlacingOrder) {
    return (
      <div className="animate-fade-in">
        <CreateErrand
          onSubmit={(data) => {
            onCreateOrder(data);
            setIsPlacingOrder(false);
            navigate('/track');
          }}
          onCancel={() => setIsPlacingOrder(false)}
          loading={submittingNote}
          initialFullName={profileName}
          initialPhoneNumber={profilePhone}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="max-w-md mx-auto text-center py-6 md:py-12 space-y-10 animate-fade-in">
        {/* Branding Title & Slogan */}
        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-slate-50 tracking-tight">
            CampusRunner
          </h1>

          <div className="space-y-1">
            <p className="text-2xl md:text-3xl font-extrabold text-gray-850 dark:text-slate-205 tracking-tight">
              Need something?
            </p>
            <p className="text-2xl md:text-3xl font-extrabold text-[#0B6B3A] dark:text-[#32b56e] tracking-tight">
              We'll get it for you.
            </p>
          </div>

          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Trusted student errand service.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex flex-col gap-3.5 max-w-xs mx-auto">
          <button
            onClick={() => {
              if (runnerStatus === 'Offline') {
                addToast('We are currently Offline. Check back soon!', 'info');
                return;
              }
              setIsPlacingOrder(true);
            }}
            disabled={runnerStatus === 'Offline'}
            className={`w-full py-4 text-xs font-black uppercase tracking-wider rounded-xl transition duration-150 shadow-md ${
              runnerStatus === 'Offline'
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                : 'bg-[#0B6B3A] hover:bg-[#09572E] text-white dark:bg-[#32b56e] dark:hover:bg-[#289255] cursor-pointer'
            }`}
            id="btn-place-order"
          >
            Place Order
          </button>

          <button
            onClick={() => navigate('/track')}
            className="w-full py-4 text-xs font-black uppercase tracking-wider bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-850 rounded-xl transition cursor-pointer shadow-sm text-gray-900 dark:text-slate-100"
            id="btn-track-order"
          >
            Track Existing Order
          </button>
        </div>

        {/* Clean Statistics / Status Indicator */}
        <div className="pt-8 border-t border-gray-200/60 dark:border-slate-800 max-w-xs mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-gray-50 dark:bg-slate-900/50 border border-gray-150 dark:border-slate-800">
            <span className={`w-1.5 h-1.5 rounded-full ${
              runnerStatus === 'Available' 
                ? 'bg-emerald-500 animate-pulse' 
                : runnerStatus === 'Busy' 
                ? 'bg-amber-500 animate-pulse' 
                : 'bg-red-500'
            }`} />
            <span>Runner Status: {runnerStatus}</span>
          </div>

          <div className="flex flex-col gap-1.5 text-center font-bold text-gray-500 dark:text-slate-400 text-xs">
            <div>
              Orders completed: <strong className="text-gray-900 dark:text-light font-black">127</strong>
            </div>
            <div>
              Average delivery: <strong className="text-gray-900 dark:text-light font-black">28 min</strong>
            </div>
          </div>
        </div>

        {/* Recently placed orders shortcut queue (If any exists) */}
        {mappedRecentOrders.length > 0 && (
          <div className="max-w-md mx-auto pt-6 space-y-3 font-sans pb-12">
            <h3 className="text-[9px] font-black text-gray-404 dark:text-slate-450 uppercase tracking-widest text-center flex items-center justify-center gap-1.5 font-mono">
              <History className="w-3.5 h-3.5" /> Your Recent Orders
            </h3>
            <div className="bg-white dark:bg-slate-900 border border-gray-150/80 dark:border-slate-800 rounded-2xl divide-y divide-gray-100 dark:divide-slate-805 overflow-hidden shadow-sm">
              {mappedRecentOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    onSelectErrand(order.id);
                    navigate('/track');
                  }}
                  className="w-full px-5 py-4 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-850/50 text-left flex items-center justify-between text-xs font-medium text-gray-700 dark:text-slate-300 transition"
                >
                  <div>
                    <span className="font-mono font-black text-gray-900 dark:text-slate-100 bg-gray-50 dark:bg-slate-800 px-1.5 py-1 border border-gray-200 dark:border-slate-700 rounded text-[8px]">
                      {order.orderId}
                    </span>
                    <span className="font-bold text-gray-800 dark:text-slate-202 ml-2">{order.category}</span>
                    <span className="text-gray-400 dark:text-slate-400 ml-2">Deliver: {order.location}</span>
                  </div>
                  <span className="text-[9px] font-black bg-[#0B6B3A]/10 text-[#0B6B3A] dark:text-[#32b56e] border border-[#0B6B3A]/25 dark:border-green-800/40 rounded px-2 uppercase shadow-sm">
                    {order.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div className="max-w-md mx-auto space-y-6 animate-fade-in pb-6">
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
              onUpdateProfile(tempProfileName.trim(), tempProfilePhone.trim());
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
                value={tempProfileName}
                onChange={(e) => setTempProfileName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-1.5 pl-0.5">M-Pesa Mobile Number</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-850 outline-none text-xs font-medium"
                placeholder="e.g. 0712345678"
                value={tempProfilePhone}
                onChange={(e) => setTempProfilePhone(e.target.value)}
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
    </div>
  );
};

export default StudentDashboard;

import React, { useState, useEffect, useRef } from 'react';
import { Errand, ErrandStatus, PaymentStatus } from '../types';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import ErrandChat from './ErrandChat';
import { 
  Briefcase, 
  Clock, 
  Activity, 
  CheckCircle2, 
  Users, 
  DollarSign, 
  Search, 
  Filter, 
  Table, 
  LayoutGrid, 
  MessageSquare, 
  FileText, 
  Trash2, 
  X, 
  TrendingUp, 
  Percent, 
  CheckCircle, 
  AlertTriangle, 
  CreditCard, 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  AlertCircle
} from 'lucide-react';

interface AdminDashboardProps {
  errands: Errand[];
  runnerPhone: string;
  runnerStatus: 'Available' | 'Busy' | 'Offline';
  onUpdateRunnerStatus: (nextStatus: 'Available' | 'Busy' | 'Offline') => Promise<void>;
}

const playPingSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // We want a subtle premium chiming 'ping' sound using Web Audio API
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.type = 'sine';
    // Gentle high pitch chime (A5 note)
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    // Decays down to 587.33 (D5 note) for an elegant musical interval
    osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.18);
    
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    console.warn("Audio Context playback failed or blocked by autoplay policy", err);
  }
};

const isWithinSeconds = (isoString?: string, seconds = 20) => {
  if (!isoString) return false;
  try {
    const createdTime = new Date(isoString).getTime();
    const now = Date.now();
    return Math.abs(now - createdTime) < seconds * 1000;
  } catch (e) {
    return false;
  }
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  errands,
  runnerPhone,
  runnerStatus,
  onUpdateRunnerStatus,
}) => {
  // Real-time audio notification tracking
  const knownIdsRef = useRef<Set<string>>(new Set(errands.map(e => e.id)));

  useEffect(() => {
    const currentIds = new Set(errands.map(e => e.id));
    let hasRecentNewOrder = false;

    for (const errand of errands) {
      if (!knownIdsRef.current.has(errand.id)) {
        // Evaluate if the newly introduced errand was created within the last 60 seconds
        if (isWithinSeconds(errand.createdAt, 60)) {
          hasRecentNewOrder = true;
        }
      }
    }

    if (hasRecentNewOrder) {
      playPingSound();
    }

    knownIdsRef.current = currentIds;
  }, [errands]);

  // UI and Filtering states
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Real-time synchronization states
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showChatId, setShowChatId] = useState<string | null>(null);
  const [selectedErrandId, setSelectedErrandId] = useState<string | null>(null);

  // Quote input states
  const [quotingId, setQuotingId] = useState<string | null>(null);
  const [itemCostInput, setItemCostInput] = useState<string>('');
  const [quoteZoneInput, setQuoteZoneInput] = useState<'Campus Delivery' | 'Outside Campus Delivery'>('Campus Delivery');

  // Multi-step modal or edit state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState<string>('');
  const [tempEtaText, setTempEtaText] = useState<string>('');

  // Toast confirmation
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const displayToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helper: Today's orders metric
  const todayDateString = new Date().toISOString().substring(0, 10);
  const todaysOrders = errands.filter((e) => {
    if (!e.createdAt) return false;
    return e.createdAt.substring(0, 10) === todayDateString;
  });

  // Financial computation
  const totalReceivedFees = errands
    .filter((e) => e.status === 'Delivered')
    .reduce((sum, e) => sum + (e.estimatedFee || 0), 0);

  const activeRevenuePipeline = errands
    .filter((e) => ['Accepted', 'Shopping', 'On the way', 'Awaiting Payment'].includes(e.status))
    .reduce((sum, e) => sum + (e.estimatedFee || 0), 0);

  // Status Filter options
  const filterOptions = [
    { value: 'all', label: 'All orders' },
    { value: 'Pending', label: 'Pending pool' },
    { value: 'Awaiting Payment', label: 'Awaiting Payment' },
    { value: 'Accepted', label: 'Accepted' },
    { value: 'Shopping', label: 'Shopping' },
    { value: 'On the way', label: 'On the way' },
    { value: 'Delivered', label: 'Completed' },
  ];

  // Base list resolution matching active statuses
  const filteredErrands = errands.filter((errand) => {
    const matchesFilter = activeFilter === 'all' || errand.status === activeFilter;
    
    const queryLower = searchQuery.trim().toLowerCase();
    const matchesSearch = !queryLower || 
      errand.orderId?.toLowerCase().includes(queryLower) ||
      errand.fullName?.toLowerCase().includes(queryLower) ||
      errand.phoneNumber?.toLowerCase().includes(queryLower) ||
      errand.location?.toLowerCase().includes(queryLower) ||
      errand.description?.toLowerCase().includes(queryLower);

    return matchesFilter && matchesSearch;
  });

  // Calculate quoted delivery fee
  const calculatedFee = quoteZoneInput === 'Outside Campus Delivery'
    ? 100
    : (() => {
        const cost = parseFloat(itemCostInput) || 0;
        if (cost < 200) return 20;
        if (cost <= 500) return 40;
        return 50;
      })();

  const calculatedTotal = (parseFloat(itemCostInput) || 0) + calculatedFee;

  // --- ACTIONS HANDLERS ---

  // Accept Order
  const handleAcceptOrder = async (errand: Errand) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Errand Accepted by Courier Coordinator Office. Dispatching runner.`, 
          timestamp: new Date().toISOString() 
        }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        status: 'Accepted',
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
      displayToast(`Accepted Order ${errand.orderId}`);
    } catch (err) {
      console.error('Error accepting order:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Reject Order
  const handleRejectOrder = async (errand: Errand) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Order Rejected by Logistics Coordinator.`, 
          timestamp: new Date().toISOString() 
        }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        status: 'Delivered', // Resolve progress cleanly to end flow
        paymentStatus: 'Delivered',
        runnerNote: 'Rejected by operational desk.',
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
      displayToast(`Rejected & Resolved Order ${errand.orderId}`);
    } catch (err) {
      console.error('Error rejecting order:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Send Quote
  const handleSendQuote = async (errand: Errand) => {
    const cost = parseFloat(itemCostInput) || 0;
    const fee = calculatedFee;
    const total = cost + fee;

    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Quote Sent: Item Cost KSh ${cost}, Service Fee KSh ${fee} (Total: KSh ${total})`, 
          timestamp: new Date().toISOString() 
        }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        status: 'Awaiting Payment',
        estimatedItemCost: cost,
        estimatedFee: fee,
        totalAmountDue: total,
        deliveryZone: quoteZoneInput,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
      setQuotingId(null);
      displayToast(`Quote Sent to Student for Order ${errand.orderId}`);
    } catch (err) {
      console.error('Error sending quote:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Confirm Payment
  const handleConfirmPayment = async (errand: Errand) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Payment Confirmed. Shopping sequence initiated.`, 
          timestamp: new Date().toISOString() 
        }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        status: 'Shopping',
        paymentStatus: 'Payment Confirmed',
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
      displayToast(`Payment Confirmed for Order ${errand.orderId}`);
    } catch (err) {
      console.error('Error confirming payment:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Mark Shopping
  const handleMarkShopping = async (errand: Errand) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Shopping update logged. Runner is picking order items.`, 
          timestamp: new Date().toISOString() 
        }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        status: 'Shopping',
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
      displayToast(`Order ${errand.orderId} status set to Shopping`);
    } catch (err) {
      console.error('Error marking shopping:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Mark On The Way
  const handleMarkOnTheWay = async (errand: Errand) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Runner dispatched. Dispatch package on the way.`, 
          timestamp: new Date().toISOString() 
        }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        status: 'On the way',
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
      displayToast(`Order ${errand.orderId} status set to On the Way`);
    } catch (err) {
      console.error('Error marking transit:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Mark Delivered
  const handleMarkDelivered = async (errand: Errand) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Package successfully delivered. Service transaction marked resolved.`, 
          timestamp: new Date().toISOString() 
        }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        status: 'Delivered',
        paymentStatus: 'Delivered',
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
      displayToast(`Order ${errand.orderId} completed successfully!`);
    } catch (err) {
      console.error('Error marking delivered:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Add notes or ETA
  const handleAddRunnerUpdate = async (errand: Errand) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Operational Details updated: ${tempEtaText ? `ETA [${tempEtaText}]` : ''} ${tempNoteText ? `Notes [${tempNoteText}]` : ''}`, 
          timestamp: new Date().toISOString() 
        }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        estimatedTime: tempEtaText.trim() || null,
        runnerNote: tempNoteText.trim() || null,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
      setEditingNoteId(null);
      displayToast(`Operational Notes logged for Order ${errand.orderId}`);
    } catch (err) {
      console.error('Error logging notes:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const startQuoting = (errand: Errand) => {
    setQuotingId(errand.id);
    setItemCostInput(errand.budget ? errand.budget.toString() : '');
    setQuoteZoneInput(errand.deliveryZone || 'Campus Delivery');
  };

  const startNoteEditing = (errand: Errand) => {
    setEditingNoteId(errand.id);
    setTempNoteText(errand.runnerNote || '');
    setTempEtaText(errand.estimatedTime || '');
  };

  const getStatusBadgeClass = (status: ErrandStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      case 'Awaiting Payment':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/35';
      case 'Accepted':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/35';
      case 'Shopping':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/35';
      case 'On the way':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900/35';
      case 'Delivered':
        return 'bg-[#0B6B3A]/10 text-[#0B6B3A] border-[#0B6B3A]/25 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-900/35';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-205';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-1 animate-fade-in pb-16 font-sans">
      
      {/* Toast Confirmation Box */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-55 bg-slate-900 text-white dark:bg-[#0B6B3A] dark:text-white px-5 py-3.5 rounded-xl text-xs font-bold font-mono tracking-wide shadow-2xl border border-slate-800 dark:border-emerald-700/50 flex items-center gap-2.5 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* OPERATIONS CENTER HEADER & STATUS CONTROLLER */}
      <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-all duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0B6B3A] dark:text-[#32b56e]">
              Active Fleet Command Center
            </span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1 tracking-tight">
            CampusRunner Operations
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-lg font-medium leading-relaxed">
            Real-time fintech telemetry console. Dispatch couriers, audit incoming orders, configure billing quotes, and manage student communication.
          </p>
        </div>

        {/* OPERATIONS STATUS TOGGLE */}
        <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-gray-150 dark:border-slate-800/70 rounded-2xl w-full lg:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-inner">
          <div className="text-left shrink-0">
            <span className="block text-[8px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Availability Toggle</span>
            <span className="text-xs font-extrabold text-gray-800 dark:text-slate-250">Terminal State</span>
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto">
            {(['Available', 'Busy', 'Offline'] as const).map((status) => {
              const isActive = runnerStatus === status;
              let btnStyle = 'bg-white dark:bg-slate-905 text-gray-500 border border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800';
              if (isActive) {
                if (status === 'Available') btnStyle = 'bg-[#0B6B3A] text-white font-black shadow-sm';
                else if (status === 'Busy') btnStyle = 'bg-[#F4B400] text-slate-950 font-black';
                else btnStyle = 'bg-red-650 text-white font-black shadow-sm';
              }
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onUpdateRunnerStatus(status)}
                  className={`flex-1 sm:flex-initial px-4 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer ${btnStyle}`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      status === 'Available' ? 'bg-emerald-500' : status === 'Busy' ? 'bg-amber-500' : 'bg-red-500'
                    } ${isActive ? 'bg-white' : ''}`} />
                    {status}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* OPERATIONS telemetry METRICS GRID (BENTO BOX) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Total Orders */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 rounded-xl">
            <Briefcase className="w-5 h-5 text-[#0B6B3A]" />
          </div>
          <div className="text-left">
            <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500 block">Total Orders</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white leading-none block mt-1">
              {errands.length}
            </span>
          </div>
        </div>

        {/* Metric 2: Active Orders */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl">
            <Activity className="w-5 h-5 animate-pulse text-amber-550" />
          </div>
          <div className="text-left">
            <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500 block">Active Orders</span>
            <span className="text-2xl font-black text-gray-901 dark:text-white leading-none block mt-1">
              {errands.filter((e) => ['Pending', 'Awaiting Payment', 'Accepted', 'Shopping', 'On the way'].includes(e.status)).length}
            </span>
          </div>
        </div>

        {/* Metric 3: Completed Orders */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-left">
            <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500 block">Completed Orders</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-[#32b56e] leading-none block mt-1">
              {errands.filter((e) => e.status === 'Delivered').length}
            </span>
          </div>
        </div>

        {/* Metric 4: Today's Orders */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#F4B400]/10 text-amber-600 rounded-xl">
            <Calendar className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-left">
            <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500 block">Today's Orders</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white leading-none block mt-1">
              {todaysOrders.length}
            </span>
          </div>
        </div>

        {/* Metric 5: Revenue Audits */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#0B6B3A]/10 text-[#0B6B3A]/90 dark:text-[#32b56e] rounded-xl font-mono">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="text-left">
            <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500 block">Total Revenue</span>
            <span className="text-lg font-black text-[#0B6B3A] dark:text-[#32b56e] leading-none block mt-1">
              KSh {totalReceivedFees}
            </span>
            <span className="text-[8px] text-gray-404 block mt-0.5 font-bold">Pipeline: KSh {activeRevenuePipeline}</span>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS & SELECTION CRITERIA */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-150 dark:border-slate-800/80 shadow-sm space-y-4">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Quick Search Input */}
          <div className="relative w-full md:max-w-xs">
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2.5 bg-gray-55 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold tracking-wide outline-none text-gray-800 dark:text-white placeholder:text-gray-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-[#0B6B3A]/5 focus:border-[#0B6B3A]"
              placeholder="Search ID, name, phone, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3.5" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Board View Mode Toggle */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-gray-100 dark:bg-slate-800 text-[#0B6B3A] dark:text-[#32b56e]'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Operational Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-gray-100 dark:bg-slate-800 text-[#0B6B3A] dark:text-[#32b56e]'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Compact Operational Grid Table"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Status Trackers */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-t border-gray-100 dark:border-slate-800/60 pt-3">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0 mr-1.5" />
          {filterOptions.map((opt) => {
            const isSelected = activeFilter === opt.value;
            let count = 0;
            if (opt.value === 'all') count = errands.length;
            else count = errands.filter((e) => e.status === opt.value).length;

            return (
              <button
                key={opt.value}
                onClick={() => {
                  setActiveFilter(opt.value);
                  setSelectedErrandId(null);
                }}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg shrink-0 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#0B6B3A] text-white shadow-sm'
                    : 'bg-gray-50 dark:bg-slate-950/60 border border-gray-150 dark:border-slate-800 text-gray-550 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                {opt.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER VIEW SCHEDULERS */}

      {filteredErrands.length === 0 ? (
        <div className="py-24 text-center bg-white dark:bg-slate-900 border border-dashed border-gray-253 dark:border-slate-800 rounded-3xl animate-fade-in text-gray-400">
          <AlertCircle className="w-8 h-8 text-slate-350 mx-auto mb-3" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            No matching active errands
          </h4>
          <p className="text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto">
            Try adjusting your search keywords, status filters, or checking back later for incoming student submissions.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        
        /* TABLE OPERATIONAL CENTER VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-800/80 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-950/50 text-[10px] uppercase font-black tracking-widest text-gray-450 dark:text-slate-400 border-b border-gray-150 dark:border-slate-800">
                  <th className="py-4 px-5">ID / Created</th>
                  <th className="py-4 px-5">Student / Contact</th>
                  <th className="py-4 px-5">Description</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-5">Financials</th>
                  <th className="py-4 px-5">Statuses & Payment</th>
                  <th className="py-4 px-5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-slate-800">
                {filteredErrands.map((errand) => {
                  const isUrgent = errand.urgency === 'ASAP';
                  return (
                    <tr 
                      key={errand.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/20 text-xs font-medium text-gray-700 dark:text-slate-300 transition ${
                        selectedErrandId === errand.id ? 'bg-[#0B6B3A]/5 dark:bg-emerald-950/10' : ''
                      }`}
                    >
                      {/* ID / Timestamp */}
                      <td className="py-4 px-5">
                        <button
                          onClick={() => setSelectedErrandId(selectedErrandId === errand.id ? null : errand.id)}
                          className="font-mono font-black text-[#0B6B3A] dark:text-[#32b56e] block hover:underline text-left cursor-pointer"
                        >
                          {errand.orderId}
                        </button>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 block mt-1 font-bold">
                          {new Date(errand.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Customer / Phone */}
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-gray-900 dark:text-white block max-w-[120px] truncate">
                          {errand.fullName}
                        </div>
                        <span className="font-mono text-[10px] text-gray-400 dark:text-slate-404 block mt-0.5">
                          {errand.phoneNumber}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-4 px-5 max-w-[180px]">
                        <div className="line-clamp-2 leading-relaxed text-gray-850 dark:text-slate-200">
                          {errand.description}
                        </div>
                        {errand.notes && (
                          <div className="text-[9px] text-amber-600 dark:text-amber-400 mt-1 italic block truncate">
                            Note: {errand.notes}
                          </div>
                        )}
                      </td>

                      {/* Delivery location */}
                      <td className="py-4 px-5">
                        <span className="text-gray-900 dark:text-slate-200 font-bold block max-w-[100px] truncate" title={errand.location}>
                          {errand.location}
                        </span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">{errand.deliveryZone || 'Campus Delivery'}</span>
                      </td>

                      {/* Financial breakdown */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex flex-col font-bold">
                          <span>Quote Item: <strong className="text-slate-900 dark:text-white font-black">KSh {errand.estimatedItemCost || errand.budget || 'Market'}</strong></span>
                          <span className="text-[#0B6B3A] dark:text-[#32b56e] text-[10px] font-black mt-0.5">Fee: KSh {errand.estimatedFee || 0}</span>
                          {errand.totalAmountDue && (
                            <span className="text-amber-600 font-black text-[10px] mt-0.5">Total: KSh {errand.totalAmountDue}</span>
                          )}
                        </div>
                      </td>

                      {/* Status Badges & Payment status */}
                      <td className="py-4 px-5">
                        <span className={`px-2 py-0.5 border rounded text-[9px] font-black uppercase tracking-wider inline-block ${getStatusBadgeClass(errand.status)}`}>
                          {errand.status}
                        </span>
                        
                        <div className="mt-1 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${errand.paymentStatus === 'Payment Confirmed' ? 'bg-emerald-500' : 'bg-amber-450'}`} />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-450 text-slate-400">
                            {errand.paymentStatus}
                          </span>
                        </div>
                      </td>

                      {/* Admin Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex gap-1 justify-end items-center">
                          <button
                            onClick={() => setSelectedErrandId(selectedErrandId === errand.id ? null : errand.id)}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-gray-250 dark:border-slate-700 hover:bg-slate-100 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-202 cursor-pointer"
                          >
                            Details
                          </button>
                          
                          {errand.status === 'Pending' && (
                            <button
                              onClick={() => startQuoting(errand)}
                              className="px-3 py-1.5 bg-[#F4B400] text-slate-950 hover:bg-[#DBA200] font-black rounded-lg text-[9px] uppercase cursor-pointer"
                            >
                              Quote
                            </button>
                          )}

                          {errand.status === 'Accepted' && (
                            <button
                              onClick={() => handleMarkShopping(errand)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-lg text-[9px] uppercase cursor-pointer"
                            >
                              Shop
                            </button>
                          )}

                          {errand.status === 'Shopping' && (
                            <button
                              onClick={() => handleMarkOnTheWay(errand)}
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black rounded-lg text-[9px] uppercase cursor-pointer"
                            >
                              Transit
                            </button>
                          )}

                          {errand.status === 'On the way' && (
                            <button
                              onClick={() => handleMarkDelivered(errand)}
                              className="px-3 py-1.5 bg-[#0B6B3A] hover:bg-[#09572E] text-white font-black rounded-lg text-[9px] uppercase cursor-pointer"
                            >
                              Deliver
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        
        /* CARD MULTI-SECTION OPERATIONS QUEUE GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start animate-fade-in">
          {filteredErrands.map((errand) => {
            const isUrgent = errand.urgency === 'ASAP';
            const isSelected = selectedErrandId === errand.id;

            return (
              <div
                key={errand.id}
                onClick={() => {
                  if (!isSelected) {
                    setSelectedErrandId(errand.id);
                  }
                }}
                className={`bg-white dark:bg-slate-900 border text-left p-6 rounded-3xl transition-all duration-200 relative cursor-pointer shadow-sm hover:border-gray-300 dark:hover:border-slate-700 ${
                  isSelected 
                    ? 'border-[#0B6B3A] ring-4 ring-[#0B6B3A]/5 dark:border-[#32b56e] dark:ring-emerald-950/20 shadow-md' 
                    : 'border-gray-150 dark:border-slate-800/80'
                }`}
              >
                {/* Upper ID Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-gray-100 dark:border-slate-850/60">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-black text-gray-800 dark:text-slate-100 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 px-2 py-0.5 rounded">
                      {errand.orderId}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                      {errand.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isUrgent && (
                      <span className="px-2 py-0.5 bg-red-50 text-red-650 border border-red-150/40 rounded text-[9px] font-black uppercase tracking-wider animate-pulse">
                        ASAP
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 border rounded text-[9px] font-black uppercase tracking-widest ${getStatusBadgeClass(errand.status)}`}>
                      {errand.status}
                    </span>
                  </div>
                </div>

                {/* Main operational task string block */}
                <div className="py-4 space-y-2.5">
                  <p className="text-sm font-black text-gray-950 dark:text-white leading-normal">
                    {errand.description}
                  </p>
                  
                  {errand.notes && (
                    <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/60 dark:border-amber-900/20 rounded-xl px-3 py-2.5 text-xs text-gray-700 dark:text-slate-350 select-all leading-relaxed">
                      <span className="block text-[8px] uppercase tracking-wider font-extrabold text-amber-704 mr-1">Student instructions:</span>
                      <strong className="font-bold">{errand.notes}</strong>
                    </div>
                  )}

                  {/* Multi-parameter bento info layout inside order card */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-2.5 text-[11px] font-semibold text-gray-550 dark:text-slate-400">
                    
                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase block font-bold">Client Student</span>
                      <strong className="text-gray-900 dark:text-slate-100 font-extrabold text-xs flex items-center gap-1 mt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {errand.fullName}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase block font-bold">Client Telephone</span>
                      <strong className="text-gray-901 dark:text-slate-200 select-all font-mono font-bold flex items-center gap-1 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {errand.phoneNumber}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase block font-bold">Destination Drop-off</span>
                      <strong className="text-gray-900 dark:text-slate-100 font-extrabold flex items-center gap-1 mt-0.5 truncate" title={errand.location}>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {errand.location}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase block font-bold">Delivery Zone</span>
                      <strong className="text-slate-700 dark:text-slate-300 font-bold ml-0.5 mt-0.5 block truncate">
                        {errand.deliveryZone || 'Campus Delivery'}
                      </strong>
                    </div>
                    
                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase block font-bold">Estimate Cost Basis</span>
                      <span className="text-gray-900 dark:text-slate-205 font-black block mt-0.5 text-xs">
                        {errand.estimatedItemCost !== undefined && errand.estimatedItemCost !== null
                          ? `KSh ${errand.estimatedItemCost} (Actual)`
                          : errand.budget
                          ? `KSh ${errand.budget} (Budget Limit)`
                          : 'Market price / Unset'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase block font-bold">Total Payment Obligation</span>
                      <span className="text-[#0B6B3A] dark:text-[#32b56e] font-black block mt-0.5 text-xs">
                        KSh {errand.totalAmountDue || (errand.estimatedFee ? (errand.estimatedFee + (errand.estimatedItemCost || 0)) : 'Pending Quote')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment status bar inside card */}
                <div className="bg-slate-50 dark:bg-slate-950/40 border border-gray-150 dark:border-slate-805 rounded-2xl p-3.5 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="text-[8px] text-gray-400 uppercase tracking-wide block">Payment Channel</span>
                    <span className="font-extrabold text-slate-750 dark:text-slate-250">{errand.paymentMethod}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[8px] text-gray-400 uppercase tracking-wide block">State Status</span>
                    <span className="inline-flex items-center gap-1.5 mt-0.5 text-[#0B6B3A] dark:text-[#32b56e] font-black uppercase text-[10px]">
                      <CreditCard className="w-3.5 h-3.5" /> {errand.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Submitting state inline update triggers */}
                {isSelected && (
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-slate-850/60 space-y-4 animate-in fade-in duration-200">
                    
                    {/* Quotation Composer Frame */}
                    {quotingId === errand.id ? (
                      <div className="bg-amber-50/50 dark:bg-slate-950 border border-amber-201/60 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-[#0B6B3A]">
                          Quotation Calculator
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">Item Cost (KSh)</label>
                            <input
                              type="number"
                              className="w-full bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-901 dark:text-white max-w-xs"
                              placeholder="e.g. 240, 500"
                              value={itemCostInput}
                              onChange={(e) => setItemCostInput(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">Delivery Zone</label>
                            <select
                              className="w-full bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-700 rounded-lg px-2 py-2 text-xs font-bold text-gray-901 dark:text-white cursor-pointer"
                              value={quoteZoneInput}
                              onChange={(e) => setQuoteZoneInput(e.target.value as any)}
                            >
                              <option value="Campus Delivery">Campus Zone (Variable: KSh 20 to 50)</option>
                              <option value="Outside Campus Delivery">Outside Campus (Flat: KSh 100)</option>
                            </select>
                          </div>
                        </div>

                        {/* Calculated Breakdown preview */}
                        <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-gray-150 text-[11px] font-bold space-y-1 text-gray-600 dark:text-slate-350">
                          <div className="flex justify-between">
                            <span>Computed Service Fee:</span>
                            <span className="text-zinc-800 dark:text-slate-100">KSh {calculatedFee}</span>
                          </div>
                          <div className="flex justify-between border-t border-dashed border-gray-150 pt-1.5 font-black text-gray-900 dark:text-white">
                            <span>Student Total Due:</span>
                            <span className="text-[#0B6B3A] dark:text-[#32b56e]">KSh {calculatedTotal}</span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setQuotingId(null)}
                            className="px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-gray-250 text-[10px] font-black uppercase rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendQuote(errand)}
                            className="px-4 py-1.5 bg-[#0B6B3A] text-white hover:bg-[#09572E] text-[10px] font-black uppercase rounded-lg cursor-pointer shadow"
                          >
                            Send Quote
                          </button>
                        </div>
                      </div>
                    ) : editingNoteId === errand.id ? (
                      
                      /* Operational Notes Frame */
                      <div className="bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Configure Route ETA & Note Details
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">Time Estimate (ETA)</label>
                            <input
                              type="text"
                              value={tempEtaText}
                              onChange={(e) => setTempEtaText(e.target.value)}
                              placeholder="e.g. 15-20 Mins, By 5:00 PM"
                              className="w-full bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[8px] font-black uppercase text-gray-400 mb-1">Runner Note</label>
                            <textarea
                              rows={1}
                              value={tempNoteText}
                              onChange={(e) => setTempNoteText(e.target.value)}
                              placeholder="Store selected, transit details..."
                              className="w-full bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 dark:text-white resize-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-gray-250 text-[10px] font-black uppercase rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddRunnerUpdate(errand)}
                            className="px-4 py-1.5 bg-[#0B6B3A] text-white hover:bg-[#09572E] text-[10px] font-black uppercase rounded-lg cursor-pointer"
                          >
                            Save operational data
                          </button>
                        </div>
                      </div>
                    ) : (
                      
                      /* PRIMARY RUNNER ADMIN STEPS HUB POPOVER */
                      <div className="space-y-4">
                        
                        {/* Interactive Steps Controls */}
                        <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-gray-150 dark:border-slate-800 flex flex-wrap gap-2 text-xs">
                          <span className="text-[9px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider self-center mr-1">Steps:</span>
                          
                          {errand.status === 'Pending' && (
                            <>
                              <button
                                onClick={() => handleAcceptOrder(errand)}
                                className="px-3.5 py-2 bg-[#0B6B3A]/10 text-[#0B6B3A] dark:text-[#32b56e] font-black rounded-lg uppercase text-[10px] cursor-pointer hover:bg-[#0B6B3A]/15 border border-[#0B6B3A]/20"
                              >
                                Accept Order
                              </button>
                              <button
                                onClick={() => startQuoting(errand)}
                                className="px-3.5 py-2 bg-[#F4B400] text-slate-950 font-black rounded-lg uppercase text-[10px] cursor-pointer hover:bg-amber-400"
                              >
                                Send Quote
                              </button>
                              <button
                                onClick={() => handleRejectOrder(errand)}
                                className="px-3.5 py-2 bg-red-50 text-red-650 font-black rounded-lg uppercase text-[10px] cursor-pointer hover:bg-red-100/50 border border-red-200"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {errand.status === 'Awaiting Payment' && (
                            <button
                              onClick={() => handleConfirmPayment(errand)}
                              className="px-4 py-2 bg-purple-600 text-white font-black rounded-lg uppercase text-[10px] cursor-pointer hover:bg-purple-700 shadow-sm"
                            >
                              Confirm Payment &amp; Shop
                            </button>
                          )}

                          {['Accepted', 'Shopping', 'On the way', 'Awaiting Payment'].includes(errand.status) && (
                            <>
                              <button
                                onClick={() => handleMarkShopping(errand)}
                                className={`px-3 py-2 font-bold rounded-lg uppercase text-[9px] cursor-pointer border ${
                                  errand.status === 'Shopping' 
                                    ? 'bg-purple-100 border-purple-250 text-purple-750' 
                                    : 'bg-white border-gray-200 text-gray-650 hover:bg-gray-50'
                                }`}
                              >
                                Mark Shopping
                              </button>
                              <button
                                onClick={() => handleMarkOnTheWay(errand)}
                                className={`px-3 py-2 font-bold rounded-lg uppercase text-[9px] cursor-pointer border ${
                                  errand.status === 'On the way' 
                                    ? 'bg-cyan-100 border-cyan-250 text-cyan-750' 
                                    : 'bg-white border-gray-200 text-gray-650 hover:bg-gray-50'
                                }`}
                              >
                                Mark On The Way
                              </button>
                              <button
                                onClick={() => handleMarkDelivered(errand)}
                                className="px-3.5 py-2 bg-[#0B6B3A] text-white font-black rounded-lg uppercase text-[10px] cursor-pointer hover:bg-[#09572E]"
                              >
                                Mark Delivered
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => startNoteEditing(errand)}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold rounded-lg uppercase text-[9px] cursor-pointer ml-auto"
                          >
                            Runner Note
                          </button>
                        </div>

                        {/* ORDER TIMELINE CHART TRACKING */}
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-gray-150 dark:border-slate-805 rounded-2xl flex flex-col gap-3">
                          <span className="text-[9px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-widest block font-mono">
                            Operational Events log &amp; Timeline
                          </span>

                          <div className="relative pl-4 border-l border-gray-200 dark:border-slate-800 space-y-3.5 py-1 text-xs">
                            {(errand.timeline || []).length === 0 ? (
                              <p className="text-[10px] italic text-zinc-400">Order recorded into cloud registry. Awaiting first operations log.</p>
                            ) : (
                              errand.timeline.map((evt, idx) => (
                                <div key={idx} className="relative">
                                  <span className="absolute -left-[20.5px] top-1 w-2 h-2 rounded-full bg-[#0B6B3A] border-2 border-white dark:border-slate-900" />
                                  <div className="flex justify-between text-[11px] leading-snug font-semibold text-gray-800 dark:text-slate-200">
                                    <span className="max-w-[210px]">{evt.status}</span>
                                    <span className="text-[10px] text-gray-400 font-bold shrink-0 ml-4">
                                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* DIRECT IN-APP CUSTOMER CHAT DIALOG */}
                        <div className="pt-3 border-t border-gray-100 dark:border-slate-850/60 w-full">
                          {showChatId === errand.id ? (
                            <ErrandChat
                              errandId={errand.id}
                              senderPhone={runnerPhone}
                              senderRole="runner"
                              senderName="Courier Coordinator Agent"
                              onClose={() => setShowChatId(null)}
                            />
                          ) : (
                            <button
                              onClick={() => setShowChatId(errand.id)}
                              className="w-full py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-gray-200 dark:border-slate-750 text-gray-700 dark:text-slate-202 text-xs font-black uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4 text-[#0B6B3A]" />
                              Direct Chat with {errand.fullName} ({errand.paymentStatus})
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Visual expansion helper text */}
                {!isSelected && (
                  <p className="text-[10px] font-black text-[#0B6B3A]/90 dark:text-[#32b56e] uppercase tracking-wider mt-4 hover:underline block text-right font-mono">
                    Expand Operations Desk &rarr;
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

import React, { useState } from 'react';
import { Errand, ErrandStatus, PaymentStatus } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import ErrandChat from './ErrandChat';
import { MessageSquare, Clock, AlertTriangle, CheckCircle, FileText, RefreshCw, XCircle, DollarSign, PenTool, Shield } from 'lucide-react';

interface RunnerDashboardProps {
  errands: Errand[];
  runnerPhone: string;
  runnerStatus: 'Available' | 'Busy' | 'Offline';
  onUpdateRunnerStatus: (nextStatus: 'Available' | 'Busy' | 'Offline') => Promise<void>;
}

const RunnerDashboard: React.FC<RunnerDashboardProps> = ({ errands, runnerPhone, runnerStatus, onUpdateRunnerStatus }) => {
  const [activeTab, setActiveTab] = useState<'Pending' | 'Active' | 'Completed'>('Pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showChatId, setShowChatId] = useState<string | null>(null);

  // Field edit states for Runner Note and ETA
  const [editingId, setEditingId] = useState<string | null>(null);
  const [runnerNoteInput, setRunnerNoteInput] = useState('');
  const [estimatedTimeInput, setEstimatedTimeInput] = useState('');
  const [noteSuccessId, setNoteSuccessId] = useState<string | null>(null);

  // Transition flow state for setting ETA (minutes) when moving to 'Shopping' or 'On the way'
  const [pendingTransition, setPendingTransition] = useState<{ id: string; nextStatus: ErrandStatus } | null>(null);
  const [etaInMins, setEtaInMins] = useState<Record<string, string>>({});

  // Quotation fields per errand
  const [quotingId, setQuotingId] = useState<string | null>(null);
  const [itemCostInput, setItemCostInput] = useState<string>('');
  const [quoteZoneInput, setQuoteZoneInput] = useState<'Campus Delivery' | 'Outside Campus Delivery'>('Campus Delivery');

  const startQuoting = (errand: Errand) => {
    setQuotingId(errand.id);
    // Initialize item cost with requested budget limit in string or empty
    setItemCostInput(errand.budget ? errand.budget.toString() : '');
    setQuoteZoneInput(errand.deliveryZone || 'Campus Delivery');
  };

  const calculatedErrandFee = quoteZoneInput === 'Outside Campus Delivery'
    ? 100
    : (() => {
        const cost = parseFloat(itemCostInput) || 0;
        if (cost < 200) return 20;
        if (cost <= 500) return 40;
        return 50;
      })();

  const calculatedTotalAmount = (parseFloat(itemCostInput) || 0) + calculatedErrandFee;

  const handleSendQuote = async (errand: Errand) => {
    const cost = parseFloat(itemCostInput) || 0;
    const fee = calculatedErrandFee;
    const total = cost + fee;

    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Quotation Sent: Item Cost KSh ${cost}, Service Fee KSh ${fee} (Total: KSh ${total})`, 
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
    } catch (err) {
      console.error('Error sending quote:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmPayment = async (errand: Errand) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Payment confirmed by runner. Order moved to Shopping.`, 
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
    } catch (err) {
      console.error('Error confirming payment:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter errands
  const filteredErrands = errands.filter((errand) => {
    if (activeTab === 'Pending') {
      return errand.status === 'Pending';
    } else if (activeTab === 'Active') {
      return ['Awaiting Payment', 'Accepted', 'Shopping', 'On the way'].includes(errand.status);
    } else {
      return errand.status === 'Delivered';
    }
  });

  // Handle accepting/rejecting/modifying the status
  const handleUpdateStatus = async (errand: Errand, nextStatus: ErrandStatus) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { status: `Status updated to ${nextStatus}`, timestamp: new Date().toISOString() }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        status: nextStatus,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating status:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle request to transition status (checks if Shopping or On the way requires ETA input)
  const handleRequestTransition = (errand: Errand, nextStatus: ErrandStatus) => {
    if (nextStatus === 'Shopping' || nextStatus === 'On the way') {
      setPendingTransition({ id: errand.id, nextStatus });
      // Pre-fill with digits from existing ETA if it exists
      const existingEta = errand.estimatedTime ? errand.estimatedTime.replace(/\D/g, '') : '';
      setEtaInMins((prev) => ({ ...prev, [errand.id]: existingEta }));
    } else {
      handleUpdateStatus(errand, nextStatus);
    }
  };

  // Finalize the status transition with the user-provided ETA (in minutes)
  const handleConfirmTransition = async (errand: Errand) => {
    if (!pendingTransition) return;
    const { nextStatus } = pendingTransition;
    const minsStr = etaInMins[errand.id]?.trim();

    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const formattedTime = minsStr ? `${minsStr} Mins` : errand.estimatedTime || null;

      const trackingLogMessage = minsStr
        ? `Status updated to ${nextStatus} (ETA: ${minsStr} Mins)`
        : `Status updated to ${nextStatus}`;

      const updatedTimeline = [
        ...currentTimeline,
        { status: trackingLogMessage, timestamp: new Date().toISOString() }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        status: nextStatus,
        estimatedTime: formattedTime,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });

      setPendingTransition(null);
    } catch (err) {
      console.error('Error completing transition with ETA:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Reject Errand status
  const handleRejectErrand = async (errand: Errand) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { status: `Errand Rejected`, timestamp: new Date().toISOString() }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        status: 'Delivered', // End progress cleanly
        paymentStatus: 'Delivered',
        runnerNote: 'Order rejected by courier coordinator desk.',
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error rejecting errand:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Convert payment state helper
  const handleUpdatePaymentStatus = async (errand: Errand, nextPaymentStatus: PaymentStatus) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { status: `Payment Status updated: ${nextPaymentStatus}`, timestamp: new Date().toISOString() }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        paymentStatus: nextPaymentStatus,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating payment status:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Edit Note & ETA Submissions
  const handleSubmitRunnerUpdate = async (errand: Errand) => {
    setUpdatingId(errand.id);
    try {
      const currentTimeline = errand.timeline || [];
      const updatedTimeline = [
        ...currentTimeline,
        { 
          status: `Notes / ETA modified: ${estimatedTimeInput ? `ETA [${estimatedTimeInput}]` : ''} ${runnerNoteInput ? `Note [${runnerNoteInput}]` : ''}`, 
          timestamp: new Date().toISOString() 
        }
      ];

      const errandRef = doc(db, 'errands', errand.id);
      await updateDoc(errandRef, {
        estimatedTime: estimatedTimeInput.trim() || null,
        runnerNote: runnerNoteInput.trim() || null,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString(),
      });
      setEditingId(null);
      setNoteSuccessId(errand.id);
      setTimeout(() => setNoteSuccessId(null), 3000);
    } catch (err) {
      console.error('Error submitting runner notes update:', err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errand.id}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const startEditing = (errand: Errand) => {
    setEditingId(errand.id);
    setRunnerNoteInput(errand.runnerNote || '');
    setEstimatedTimeInput(errand.estimatedTime || '');
  };

  const getStatusBadgeColor = (status: ErrandStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Accepted':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Shopping':
        return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'On the way':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Delivered':
        return 'bg-[#0B6B3A]/10 text-[#0B6B3A] border-[#0B6B3A]/20';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Title block with availability updater */}
      <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 transition-colors duration-200">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#0B6B3A] dark:text-[#32b56e]">
            CampusRunner Admin Console
          </span>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            Logistics Control Center
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Manage student errands, progressive status updates, payment confirmations, and chat.
          </p>
        </div>

        {/* Change Runner Availability Status settings control path */}
        <div className="bg-gray-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 w-full lg:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-left">
            <span className="block text-[9px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider">Availability Status</span>
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200">Runner Operations</span>
          </div>
          <div className="flex gap-1.5 w-full sm:w-auto">
            {(['Available', 'Busy', 'Offline'] as const).map((status) => {
              const isActive = runnerStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onUpdateRunnerStatus(status)}
                  className={`flex-1 sm:flex-initial px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? status === 'Available'
                        ? 'bg-[#0B6B3A] text-white shadow-sm'
                        : status === 'Busy'
                        ? 'bg-[#F4B400] text-slate-900 font-extrabold'
                        : 'bg-red-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick summary stats */}
      <div className="grid grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 border border-gray-150 dark:border-slate-800 rounded-2xl transition-colors duration-200 shadow-sm text-center">
        <div>
          <span className="block text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500">Pending Pool</span>
          <span className="text-xl font-black text-gray-900 dark:text-slate-100">
            {errands.filter((e) => e.status === 'Pending').length}
          </span>
        </div>
        <div className="border-l border-gray-150 dark:border-slate-800">
          <span className="block text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500">Active Delivery</span>
          <span className="text-xl font-black text-[#F4B400]">
            {errands.filter((e) => ['Awaiting Payment', 'Accepted', 'Shopping', 'On the way'].includes(e.status)).length}
          </span>
        </div>
        <div className="border-l border-gray-150 dark:border-slate-800">
          <span className="block text-[9px] uppercase font-bold text-gray-400 dark:text-slate-500">Total Fulfilled</span>
          <span className="text-xl font-black text-[#0B6B3A] dark:text-[#32b56e]">
            {errands.filter((e) => e.status === 'Delivered').length}
          </span>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-1 shadow-sm border transition-colors duration-200">
        {(['Pending', 'Active', 'Completed'] as const).map((tab) => {
          const isActive = activeTab === tab;
          let count = 0;
          if (tab === 'Pending') count = errands.filter((e) => e.status === 'Pending').length;
          else if (tab === 'Active') count = errands.filter((e) => ['Awaiting Payment', 'Accepted', 'Shopping', 'On the way'].includes(e.status)).length;
          else count = errands.filter((e) => e.status === 'Delivered').length;

          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setEditingId(null);
              }}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all rounded-xl flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#0B6B3A] dark:bg-[#119F57] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab}</span>
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-650 dark:text-slate-350'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Requests list */}
      <div className="space-y-5">
        {filteredErrands.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
            <span className="text-xs font-bold text-gray-400 dark:text-slate-550 uppercase tracking-widest block">
              No errands found in this section
            </span>
          </div>
        ) : (
          filteredErrands.map((errand) => {
            const isUrgent = errand.urgency === 'ASAP';
            return (
              <div
                key={errand.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-150 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:border-gray-200 dark:hover:border-slate-700 transition"
              >
                {/* Details Section */}
                <div className="space-y-4 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2.5 py-1 rounded">
                      {errand.orderId}
                    </span>
                    <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded text-[9px] font-extrabold text-gray-600 dark:text-slate-400 uppercase tracking-wider">
                      {errand.category}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 border rounded text-[9px] font-extrabold uppercase tracking-wider ${getStatusBadgeColor(
                        errand.status
                      )}`}
                    >
                      {errand.status}
                    </span>
                    {isUrgent && (
                      <span className="px-2.5 py-0.5 bg-red-50 dark:bg-red-950/20 border border-red-101 dark:border-red-900/30 text-red-650 dark:text-red-400 rounded text-[9px] font-black uppercase tracking-wider">
                        ASAP Express
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-slate-100 leading-snug">
                      {errand.description}
                    </h3>

                    {/* Optional User Additional Instructions */}
                    {errand.notes && (
                      <div className="mt-3 bg-gray-55 dark:bg-slate-950/50 px-3.5 py-2.5 rounded-xl border border-gray-150 dark:border-slate-800 text-xs text-gray-700 dark:text-slate-400 font-medium">
                        <span className="block text-[9px] uppercase font-black tracking-wider text-gray-400 dark:text-slate-500">Additional Instructions:</span>
                        <p className="mt-0.5 leading-relaxed font-bold">{errand.notes}</p>
                      </div>
                    )}
                    
                    {/* Information Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-4 text-xs font-semibold text-gray-600 dark:text-slate-350">
                      <div>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase block mb-0.5 font-bold">
                          Delivery Place / Location
                        </span>
                        <span className="text-gray-950 dark:text-slate-100 font-bold">{errand.location}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase block mb-0.5 font-bold">
                          Client Full Name
                        </span>
                        <span className="text-gray-950 dark:text-slate-100 font-extrabold">{errand.fullName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase block mb-0.5 font-bold">
                          Customer Phone Number
                        </span>
                        <div className="flex gap-2 items-center mt-0.5">
                          <span className="text-gray-900 dark:text-slate-200 select-all font-mono font-bold">
                            {errand.phoneNumber}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase block mb-0.5 font-bold">
                          Delivery Zone & Fee
                        </span>
                        <div className="flex flex-col">
                          <span className="text-gray-950 dark:text-slate-100 font-extrabold">{errand.deliveryZone || 'Campus Delivery'}</span>
                          <span className="text-[#0B6B3A] dark:text-[#32b56e] font-black">
                            KSh {errand.estimatedFee || (errand.deliveryZone === 'Outside Campus Delivery' ? 100 : 50)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase block mb-0.5 font-bold">
                          Item Budget (KSh)
                        </span>
                        <span className="text-gray-850 dark:text-slate-250 font-black">
                          {errand.budget ? `${errand.budget} KSh` : 'Market Price / Limitless'}
                        </span>
                      </div>
                      {errand.estimatedItemCost !== undefined && errand.estimatedItemCost !== null && (
                        <div>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase block mb-0.5 font-bold">
                            Estimated Item Cost
                          </span>
                          <span className="text-gray-950 dark:text-slate-100 font-black">
                            KSh {errand.estimatedItemCost}
                          </span>
                        </div>
                      )}
                      {errand.totalAmountDue !== undefined && errand.totalAmountDue !== null && (
                        <div>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase block mb-0.5 font-bold">
                            Total Amount Due
                          </span>
                          <span className="text-amber-600 dark:text-amber-400 font-black">
                            KSh {errand.totalAmountDue}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Status Administration */}
                  <div className="bg-gray-50 dark:bg-slate-800/40 rounded-xl p-4 border border-gray-100/80 dark:border-slate-800/85 space-y-3 text-xs">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <span className="text-[9px] uppercase font-black text-gray-400 dark:text-slate-500 block">Payment Method</span>
                        <strong className="text-slate-800 dark:text-slate-200 font-extrabold">{errand.paymentMethod}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-black text-gray-400 dark:text-slate-500 block text-right">Payment Status</span>
                        <strong className="text-[#0B6B3A] dark:text-[#32b56e] font-extrabold uppercase text-[10px]">{errand.paymentStatus}</strong>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2.5 border-t border-gray-200 dark:border-slate-800">
                      <span className="text-[9px] font-black uppercase text-gray-400 dark:text-slate-500 self-center">Confirm Status:</span>
                      <button
                        onClick={() => handleUpdatePaymentStatus(errand, 'Pending Payment')}
                        disabled={updatingId === errand.id}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border cursor-pointer transition-all ${
                          errand.paymentStatus === 'Pending Payment'
                            ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40'
                            : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-250 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => handleUpdatePaymentStatus(errand, 'Payment Confirmed')}
                        disabled={updatingId === errand.id}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border cursor-pointer transition-all ${
                          errand.paymentStatus === 'Payment Confirmed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-450 dark:border-emerald-900/40'
                            : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-250 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Confirmed
                      </button>
                      <button
                        onClick={() => handleUpdatePaymentStatus(errand, 'Delivered')}
                        disabled={updatingId === errand.id}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase border cursor-pointer transition-all ${
                          errand.paymentStatus === 'Delivered'
                            ? 'bg-blue-100 text-blue-800 border-blue-205 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40'
                            : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-250 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        Settled / Paid
                      </button>
                    </div>
                  </div>

                  {/* ETA & Custom Note updates display */}
                  <div className="space-y-2">
                    {editingId === errand.id ? (
                      <div className="bg-slate-50 dark:bg-slate-950/40 border border-gray-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-inner animate-in slide-in-from-top-2 duration-150 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider mb-1.5">
                              Estimated Delivery Time (ETA)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 25-30 Mins, By 4:30 PM"
                              value={estimatedTimeInput}
                              onChange={(e) => setEstimatedTimeInput(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-700 rounded-lg font-semibold text-gray-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 tracking-wider mb-1.5">
                              Coordinator Instructions / Notes
                            </label>
                            <textarea
                              rows={1}
                              placeholder="e.g. Bread brand bread selected, item out of stock..."
                              value={runnerNoteInput}
                              onChange={(e) => setRunnerNoteInput(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-255 dark:border-slate-700 rounded-lg font-semibold text-gray-800 dark:text-white resize-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-[10px] font-black uppercase text-slate-800 dark:text-slate-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSubmitRunnerUpdate(errand)}
                            disabled={updatingId === errand.id}
                            className="px-4 py-1.5 bg-[#0B6B3A] dark:bg-[#119F57] hover:bg-[#09572E] text-white rounded-lg text-[10px] font-black uppercase"
                          >
                            {updatingId === errand.id ? 'Saving...' : 'Save Update'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {errand.estimatedTime && (
                           <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 text-[#D88D00] dark:text-amber-450 border border-amber-200 dark:border-amber-900/30 px-2.5 py-1 rounded-lg font-semibold text-[10px]">
                            <Clock className="w-3 h-3" /> ETA: {errand.estimatedTime}
                          </span>
                        )}
                        {errand.runnerNote && (
                          <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800/40 text-gray-600 dark:text-slate-350 border border-gray-200 dark:border-slate-850 px-2.5 py-1 rounded-lg font-semibold text-[10px] line-clamp-1 max-w-xs">
                            <FileText className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" /> Note: {errand.runnerNote}
                          </span>
                        )}
                        <button
                          onClick={() => startEditing(errand)}
                          className="inline-flex items-center gap-1 text-[#0B6B3A] dark:text-[#32b56e] hover:underline font-bold text-[10px] uppercase ml-1 cursor-pointer"
                        >
                          <PenTool className="w-3 h-3" /> {errand.estimatedTime || errand.runnerNote ? 'Edit Notes / ETA' : 'Add Notes / ETA'}
                        </button>
                        {noteSuccessId === errand.id && (
                          <span className="text-[10px] text-[#0B6B3A] dark:text-[#32b56e] font-bold ml-2">Notes updated!</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider pt-2 border-t border-gray-105 dark:border-slate-800">
                    Order Timestamp:{' '}
                    {new Date(errand.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  {/* Real-time Integrated Customer Chat on Active Errands */}
                  {['Accepted', 'Shopping', 'On the way'].includes(errand.status) && (
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                      {showChatId === errand.id ? (
                        <div className="mt-2 text-left">
                          <ErrandChat
                            errandId={errand.id}
                            senderPhone={runnerPhone}
                            senderName="Courier Coordinator Agent"
                            senderRole="runner"
                            onClose={() => setShowChatId(null)}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowChatId(errand.id)}
                          className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-755 dark:text-slate-250 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto animate-in fade-in duration-150"
                        >
                          <MessageSquare className="w-4 h-4 text-[#0B6B3A]" />
                          Open Chat with {errand.fullName} (In-App Direct Chat)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Controls Section / Status Update Panel */}
                <div className="flex flex-row md:flex-col justify-end items-center gap-3 w-full md:w-52 self-center md:self-stretch">
                  {errand.status === 'Pending' && (
                    <div className="space-y-3 w-full text-left">
                      {quotingId === errand.id ? (
                        <div className="flex flex-col gap-2.5 w-full bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 animate-in slide-in-from-top-1 duration-150">
                          <span className="text-[10px] uppercase font-black text-[#0B6B3A] dark:text-[#32b56e]">Review &amp; Quote Errand</span>
                          
                          <div>
                            <label className="block text-[9px] font-black text-gray-550 dark:text-slate-400 uppercase">Item Cost (KSh)</label>
                            <input 
                              type="number" 
                              placeholder="e.g. 150" 
                              value={itemCostInput} 
                              onChange={(e) => setItemCostInput(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-800 dark:text-white font-bold outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-black text-gray-550 dark:text-slate-400 uppercase mb-1">Delivery Zone</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setQuoteZoneInput('Campus Delivery')}
                                className={`py-2 rounded-lg border text-[10px] font-extrabold transition-all uppercase tracking-wider ${
                                  quoteZoneInput === 'Campus Delivery'
                                    ? 'border-[#0B6B3A] bg-[#0B6B3A]/10 text-[#0B6B3A] dark:text-[#32b56e]'
                                    : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                                }`}
                              >
                                Campus Zone
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuoteZoneInput('Outside Campus Delivery')}
                                className={`py-2 rounded-lg border text-[10px] font-extrabold transition-all uppercase tracking-wider ${
                                  quoteZoneInput === 'Outside Campus Delivery'
                                    ? 'border-[#0B6B3A] bg-[#0B6B3A]/10 text-[#0B6B3A] dark:text-[#32b56e]'
                                    : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                                }`}
                              >
                                Outside Campus
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-dashed border-gray-200 dark:border-slate-700 space-y-1 text-xs">
                            <div className="flex justify-between font-bold text-gray-600 dark:text-slate-400">
                              <span>Service Fee:</span>
                              <span className="text-gray-900 dark:text-white">KSh {calculatedErrandFee}</span>
                            </div>
                            <div className="flex justify-between font-black text-gray-950 dark:text-white">
                              <span>Total Amount Required:</span>
                              <span className="text-[#0B6B3A] dark:text-[#32b56e]">KSh {calculatedTotalAmount}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button 
                              onClick={() => setQuotingId(null)} 
                              className="flex-1 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase text-gray-750 dark:text-gray-100 transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSendQuote(errand)} 
                              className="flex-1 py-1.5 bg-[#F4B400] text-slate-900 font-extrabold rounded-xl text-[10px] font-black uppercase shadow-sm transition hover:bg-[#DBA200] cursor-pointer text-center"
                            >
                              Send Quote
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex md:flex-col gap-2.5 w-full">
                          <button
                            onClick={() => startQuoting(errand)}
                            className="flex-1 py-4 bg-[#F4B400] hover:bg-[#DBA200] text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md text-center"
                          >
                            Review &amp; Quote
                          </button>
                          <button
                            onClick={() => handleRejectErrand(errand)}
                            disabled={updatingId === errand.id}
                            className="flex-1 py-4 border border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {['Awaiting Payment', 'Accepted', 'Shopping', 'On the way'].includes(errand.status) && (
                    <div className="space-y-3 w-full text-left">
                      {errand.status === 'Awaiting Payment' ? (
                        <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 space-y-3 w-full text-left animate-in slide-in-from-top-1 duration-150">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-455 block">Bill Details</span>
                          <div className="text-xs space-y-1.5 text-gray-700 dark:text-slate-300 border-b border-dashed border-gray-200 dark:border-slate-700 pb-2.5">
                            <div className="flex justify-between">
                              <span>Item Cost:</span>
                              <span className="font-extrabold text-gray-950 dark:text-white">KSh {errand.estimatedItemCost}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Service Fee:</span>
                              <span className="font-extrabold text-gray-950 dark:text-white">KSh {errand.estimatedFee}</span>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-950 dark:text-white font-extrabold pb-3.5">
                            <span>Total Amount:</span>
                            <span className="text-[#0B6B3A] dark:text-[#32b56e] font-black text-sm">KSh {errand.totalAmountDue}</span>
                          </div>

                          <button
                            onClick={() => handleConfirmPayment(errand)}
                            disabled={updatingId === errand.id}
                            className="w-full py-3 bg-[#0B6B3A] dark:bg-[#119F57] hover:bg-[#09572E] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer text-center"
                          >
                            {updatingId === errand.id ? 'Confirming...' : 'Confirm Payment & Shop'}
                          </button>
                        </div>
                      ) : pendingTransition?.id === errand.id && ['Shopping', 'On the way'].includes(pendingTransition.nextStatus) ? (
                        /* ETA Transition Prompter Panel */
                        <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/45 rounded-xl p-3.5 space-y-3 w-full text-left animate-in slide-in-from-top-1 duration-150 shadow-sm">
                          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-455 font-extrabold text-xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-wider">Set Delivery ETA</span>
                          </div>
                          
                          <div>
                            <label className="block text-[8px] font-black text-amber-700 dark:text-amber-450 uppercase tracking-widest mb-1 leading-snug">
                              Minutes to {pendingTransition.nextStatus === 'Shopping' ? 'Shop' : 'Deliver'}
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="e.g. 25, 40"
                              value={etaInMins[errand.id] || ''}
                              onChange={(e) => setEtaInMins({ ...etaInMins, [errand.id]: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#0B6B3A]/10 focus:border-[#0B6B3A] transition"
                              autoFocus
                            />
                            <p className="text-[8px] text-amber-600/90 dark:text-amber-450 font-semibold mt-1">
                              Will display as "<strong>{(etaInMins[errand.id] || 'X').trim()} Mins</strong>" in client viewer
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setPendingTransition(null)}
                              className="flex-1 py-1.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-[9px] font-black uppercase text-gray-500 dark:text-slate-400 rounded-lg transition"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleConfirmTransition(errand)}
                              disabled={updatingId === errand.id}
                              className="flex-1 py-1.5 bg-[#0B6B3A] dark:bg-[#119F57] hover:bg-[#09572E] text-white text-[9px] font-black uppercase rounded-lg transition shadow-sm"
                            >
                              {updatingId === errand.id ? 'Saving...' : 'Confirm'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Standard Fulfillment Controls */
                        <>
                          <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 rounded-xl p-3">
                            <label className="block text-[8px] font-black text-gray-400 dark:text-slate-550 uppercase tracking-widest text-center mb-1.5">
                              Fulfillment Stage Update
                            </label>
                            <select
                              value={errand.status}
                              onChange={(e) =>
                                handleRequestTransition(errand, e.target.value as ErrandStatus)
                              }
                              disabled={updatingId === errand.id}
                              className="w-full text-xs font-black text-gray-850 dark:text-slate-200 bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-700 rounded-lg py-2.5 px-2 focus:outline-none transition-all cursor-pointer"
                            >
                              <option value="Awaiting Payment" className="dark:bg-slate-900 text-gray-850 dark:text-white">Awaiting Payment</option>
                              <option value="Accepted" className="dark:bg-slate-900 text-gray-850 dark:text-white">Accepted</option>
                              <option value="Shopping" className="dark:bg-slate-900 text-gray-850 dark:text-white">Shopping</option>
                              <option value="On the way" className="dark:bg-slate-900 text-gray-850 dark:text-white">On the way</option>
                              <option value="Delivered" className="dark:bg-slate-900 text-gray-850 dark:text-white">Delivered</option>
                            </select>
                          </div>

                          {/* Touch Actions */}
                          {errand.status === 'Accepted' && (
                            <button
                              onClick={() => handleRequestTransition(errand, 'Shopping')}
                              disabled={updatingId === errand.id}
                              className="w-full py-3 bg-[#F4B400] hover:bg-[#DBA200] text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                            >
                              Start Shopping
                            </button>
                          )}

                          {errand.status === 'Shopping' && (
                            <button
                              onClick={() => handleRequestTransition(errand, 'On the way')}
                              disabled={updatingId === errand.id}
                              className="w-full py-3 bg-[#F4B400] hover:bg-[#DBA200] text-slate-900 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                            >
                              Send Out to Deliver
                            </button>
                          )}

                          {errand.status === 'On the way' && (
                            <button
                              onClick={() => handleRequestTransition(errand, 'Delivered')}
                              disabled={updatingId === errand.id}
                              className="w-full py-3.5 bg-[#0B6B3A] dark:bg-[#119F57] hover:bg-[#09572E] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer text-center"
                            >
                              Verify physical delivery
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {errand.status === 'Delivered' && (
                    <div className="text-center w-full bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 py-5 px-3 rounded-2xl flex flex-col items-center justify-center space-y-1">
                      <CheckCircle className="w-5 h-5 text-[#0B6B3A] dark:text-[#32b56e]" />
                      <span className="block text-[8px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        Fulfillment Reached
                      </span>
                      <span className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase">
                        Delivered Order
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RunnerDashboard;

import React, { useState } from 'react';
import { Errand, ErrandStatus } from '../types';
import ErrandChat from './ErrandChat';
import { MessageSquare, Calendar, CreditCard, Clock, FileText, ChevronRight, Copy, Check } from 'lucide-react';

interface OrderTrackingProps {
  errand: Errand;
  onBack: () => void;
}

const OrderTracking: React.FC<OrderTrackingProps> = ({ errand, onBack }) => {
  const [showInAppChat, setShowInAppChat] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopyShareableLink = async () => {
    try {
      await navigator.clipboard.writeText(errand.orderId);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy Order ID:', err);
    }
  };

  const handleCopyPhoneNumber = async () => {
    try {
      await navigator.clipboard.writeText("0700891519");
      setCopiedPhone(true);
      setTimeout(() => {
        setCopiedPhone(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy Phone Number:', err);
    }
  };

  const statuses: ErrandStatus[] = ['Pending', 'Awaiting Payment', 'Shopping', 'On the way', 'Delivered'];
  
  const getIndex = (status: ErrandStatus) => {
    if (status === 'Accepted') return 1; // Map accepted status to Awaiting Payment index
    const idx = statuses.indexOf(status);
    return idx === -1 ? 0 : idx;
  };
  const currentIndex = getIndex(errand.status);

  // Status descriptive captions
  const statusDescriptions: Record<ErrandStatus, string> = {
    'Pending': 'Waiting for the courier coordinator to accept...',
    'Awaiting Payment': 'Fee quotation generated! Awaiting payment confirmation...',
    'Accepted': 'Your errand has been accepted and assigned!',
    'Shopping': 'The runner is shopping/processing your request...',
    'On the way': 'The runner is on the way to your location!',
    'Delivered': 'Your errand has been completed and delivered safely.',
  };

  // Payment Status Badge Colors
  const paymentStatusColors: Record<string, string> = {
    'Pending Payment': 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    'Payment Confirmed': 'bg-emerald-150 text-emerald-800 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    'Delivered': 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30'
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-8 max-w-2xl mx-auto shadow-sm space-y-8 animate-in fade-in duration-200 transition-colors duration-200">
      {/* Header and back button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-150 dark:border-slate-800 gap-4">
        <div>
          <button
            onClick={onBack}
            className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-950 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            ← Back to Dash
          </button>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-slate-100 mt-2 font-sans">
            Errand Live Tracking
          </h2>
        </div>
        <div className="text-left sm:text-right flex flex-col items-start sm:items-end gap-2">
          <div>
            <span className="block text-[9px] uppercase font-bold text-gray-400 dark:text-slate-400 tracking-wider">Order Reference</span>
            <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-lg inline-block mt-0.5 select-all">
              {errand.orderId}
            </span>
          </div>
          <button
            onClick={handleCopyShareableLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-900 bg-[#F4B400] hover:bg-[#DBA200] rounded-xl transition duration-150 shadow-sm cursor-pointer"
            id="btn-copy-share-link"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>ID Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Request ID</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-time Status Progression Bar */}
      <div className="space-y-6">
        <div className="text-center bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 space-y-2">
          <div>
            <span className="text-[10px] font-black text-[#0B6B3A] dark:text-[#32b56e] uppercase tracking-widest block">
              Current Status
            </span>
            <span className="text-2xl font-black text-gray-900 dark:text-white block mt-1 uppercase tracking-wide">
              {errand.status}
            </span>
            <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold mt-1">
              {statusDescriptions[errand.status] || 'Processing order...'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200/50 dark:border-slate-700/30 text-xs font-semibold">
            {errand.estimatedTime && (
              <div className="border-r border-gray-200/50 dark:border-slate-750">
                <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase block font-bold">Estimated Arrival</span>
                <span className="text-[#0B6B3A] dark:text-[#32b56e] font-black text-sm">{errand.estimatedTime}</span>
              </div>
            )}
            <div className={errand.estimatedTime ? '' : 'col-span-2'}>
              <span className="text-[9px] text-gray-400 dark:text-slate-500 uppercase block font-bold">Last Updated</span>
              <span className="text-gray-950 dark:text-slate-200 font-bold text-sm">
                {new Date(errand.updatedAt || errand.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Progression Stepper */}
        <div className="relative pt-4">
          {/* Thread Line */}
          <div className="absolute top-[28px] left-[15px] right-[15px] h-1 bg-gray-100 dark:bg-slate-800 -z-10 rounded" />
          <div
            className="absolute top-[28px] left-[15px] h-1 bg-[#0B6B3A] dark:bg-[#32b56e] -z-10 rounded transition-all duration-500"
            style={{ width: `${(Math.max(0, currentIndex) / (statuses.length - 1)) * 100}%` }}
          />

          <div className="flex justify-between items-start">
            {statuses.map((step, idx) => {
              const isCompleted = idx <= currentIndex;
              const isActive = idx === currentIndex;

              return (
                <div key={step} className="flex flex-col items-center flex-1">
                  {/* Step circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-4 transition-all ${
                      isActive
                        ? 'bg-[#F4B400] text-slate-900 ring-[#F4B400]/20 font-black'
                        : isCompleted
                        ? 'bg-[#0B6B3A] dark:bg-[#119F57] text-white ring-[#0B6B3A]/10 dark:ring-[#119F57]/10'
                        : 'bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-500 ring-transparent'
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* Step Label */}
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider text-center mt-2.5 max-w-[70px] ${
                      isActive
                        ? 'text-gray-950 dark:text-white font-black'
                        : isCompleted
                        ? 'text-[#0B6B3A] dark:text-[#32b56e]'
                        : 'text-gray-400 dark:text-slate-500'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quotation & Bill Summary Panel */}
      {errand.totalAmountDue !== undefined && errand.totalAmountDue !== null && errand.totalAmountDue > 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-[#F4B400]/30 rounded-2xl p-6 space-y-4 animate-in fade-in duration-200">
          <h3 className="text-xs font-black text-amber-700 dark:text-amber-450 uppercase tracking-widest flex items-center gap-1.5 font-mono">
            Order Bill Details
          </h3>
          <div className="text-xs font-semibold space-y-2 text-gray-750 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Item Cost:</span>
              <span className="font-extrabold text-gray-900 dark:text-white">KSh {errand.estimatedItemCost}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Fee ({errand.deliveryZone === 'Outside Campus Delivery' ? 'Outside Campus' : 'Campus Zone'}):</span>
              <span className="font-extrabold text-gray-900 dark:text-white">KSh {errand.estimatedFee}</span>
            </div>
            <div className="border-t border-dashed border-[#F4B400]/40 pt-2 flex justify-between text-sm font-black text-gray-900 dark:text-white font-mono">
              <span>Total Amount:</span>
              <span className="text-[#0B6B3A] dark:text-[#32b56e] font-black text-[15px]">KSh {errand.totalAmountDue}</span>
            </div>
          </div>
          {errand.status === 'Awaiting Payment' && (
            <div className="text-[10px] text-amber-805 dark:text-amber-400 font-extrabold uppercase bg-amber-100/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/10 p-3 rounded-xl leading-relaxed">
              Please pay KSh {errand.totalAmountDue} to our desk. The runner will initiate shopping immediately after payment confirmation.
            </div>
          )}
        </div>
      )}

      {/* Runner Note & ETA Section (If provided) */}
      {(errand.estimatedTime || errand.runnerNote) && (
        <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-[#F4B400]/30 rounded-2xl p-5 space-y-3">
          <h4 className="text-[10px] font-black text-[#D88D00] dark:text-amber-400 uppercase tracking-wider">
            Courier Coordinator Update
          </h4>
          <div className="grid grid-cols-1 gap-3.5 text-xs">
            {errand.estimatedTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#D88D00] dark:text-amber-400" />
                <div>
                  <span className="text-gray-400 dark:text-slate-400 font-bold uppercase text-[9px] block">Estimated Fulfillment Time</span>
                  <span className="font-extrabold text-gray-800 dark:text-slate-200">{errand.estimatedTime}</span>
                </div>
              </div>
            )}
            {errand.runnerNote && (
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-[#D88D00] dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-gray-400 dark:text-slate-400 font-bold uppercase text-[9px] block">Runner Notes / Instructions</span>
                  <p className="font-semibold text-gray-700 dark:text-slate-300 leading-relaxed italic mt-0.5">
                    "{errand.runnerNote}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Errand details specs */}
      <div className="border-t border-b border-gray-150 dark:border-slate-800 py-6">
        <h3 className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-4">
          Order Specifications
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs font-semibold">
          <div>
            <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase block mb-0.5 font-bold">Person Submitting</span>
            <span className="text-gray-950 dark:text-slate-100 font-extrabold">{errand.fullName} ({errand.phoneNumber})</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase block mb-0.5 font-bold">Delivery Hostel Location</span>
            <span className="text-gray-850 dark:text-slate-200">{errand.location}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase block mb-0.5 font-bold">Errand Category</span>
            <span className="text-gray-850 dark:text-slate-200">{errand.category}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase block mb-0.5 font-bold">Urgency Level</span>
            <span
              className={`font-black uppercase text-[10px] ${
                errand.urgency === 'ASAP' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-slate-350'
              }`}
            >
              • {errand.urgency}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase block mb-0.5 font-bold">Fulfillment Budget</span>
            <span className="text-gray-850 dark:text-slate-200">
              {errand.budget ? `${errand.budget} Ksh` : 'No Limit / Market Cash'}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase block mb-0.5 font-bold">Payment Method Chosen</span>
            <span className="text-gray-850 dark:text-slate-200">{errand.paymentMethod}</span>
          </div>
          <div className="sm:col-span-2 pt-2 border-t border-gray-50 dark:border-slate-800/40">
            <span className="text-[10px] text-gray-400 dark:text-slate-400 uppercase block mb-0.5 font-bold">Errand Request / Item List</span>
            <p className="text-gray-900 dark:text-slate-100 font-semibold whitespace-pre-wrap leading-relaxed">
              {errand.description}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Instruction Section */}
      <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
            Payment Settlement
          </h3>
          <span className={`px-2.5 py-1 border text-[9px] font-black uppercase tracking-wider rounded-full ${paymentStatusColors[errand.paymentStatus] || 'bg-gray-100 text-gray-700'}`}>
            {errand.paymentStatus}
          </span>
        </div>

        {errand.paymentMethod === 'M-Pesa' ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-600 dark:text-slate-400 leading-relaxed">
              Please pay manually to our verified M-Pesa account details below:
            </p>
            <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-xl p-4 text-xs font-semibold text-gray-800 dark:text-slate-300 space-y-3 shadow-inner">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 dark:bg-slate-950 p-3.5 rounded-xl border border-gray-150 dark:border-slate-850">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-gray-400 dark:text-slate-505 tracking-wider">M-Pesa Number</span>
                  <strong className="text-gray-905 dark:text-white font-mono font-black text-sm block mt-0.5 select-all">
                    0700891519
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPhoneNumber}
                  className="px-3 py-2 bg-[#0B6B3A] text-white hover:bg-[#09572E] rounded-lg text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 cursor-pointer select-none transition shadow"
                >
                  {copiedPhone ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Number</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-950/40 p-3 rounded-xl border border-gray-150 dark:border-slate-850/60">
                <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold">Recipient Name</span>
                <strong className="text-gray-950 dark:text-white font-black">WAITHERA</strong>
              </div>

              <div className="pt-2 border-t border-gray-150 dark:border-slate-800 mt-2 font-bold text-gray-850 dark:text-slate-200 flex justify-between items-center">
                <span>Amount Payable:</span>
                {errand.totalAmountDue ? (
                  <strong className="text-[#0B6B3A] dark:text-[#32b56e] font-black text-base">
                    KSh {errand.totalAmountDue}
                  </strong>
                ) : (
                  <strong className="text-amber-500 dark:text-amber-450 font-black text-xs">
                    Waiting for runner quote
                  </strong>
                )}
              </div>
              <div className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider pt-2 mt-2 border-t border-gray-100 dark:border-slate-850/60 leading-relaxed">
                Provide your M-Pesa reference code in the chat or wait for the coordinator to verify.
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 text-xs font-semibold text-gray-700 dark:text-slate-300 leading-relaxed space-y-1.5">
            <div>
              Payment will be collected as{' '}
              <strong className="text-[#0B6B3A] dark:text-[#32b56e] uppercase tracking-wide font-black">Cash on Delivery</strong> once our
              runner completes physical delivery to your location.
            </div>
            {errand.totalAmountDue && (
              <div className="pt-1.5 border-t border-gray-150 dark:border-slate-800/60 font-bold text-gray-850 dark:text-slate-200">
                Total to pay on delivery: <span className="text-[#0B6B3A] dark:text-[#32b56e] font-black">KSh {errand.totalAmountDue}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Transparency Timeline Logs */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest font-mono">
          Order Transparency Log
        </h4>
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 space-y-4 font-sans">
          {errand.timeline && errand.timeline.length > 0 ? (
            <div className="relative border-l-2 border-gray-100 dark:border-slate-800 pl-4 space-y-5">
              {errand.timeline.map((log, idx) => (
                <div key={idx} className="relative">
                  {/* Dot */}
                  <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-[#0B6B3A] dark:bg-[#32b56e] ring-4 ring-white dark:ring-slate-900" />
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-slate-450 font-bold uppercase font-mono tracking-wider">
                      {new Date(log.timestamp).toLocaleString([], {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="ml-2.5 text-xs text-gray-800 dark:text-slate-200 font-extrabold uppercase">
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-xs text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">
              Log timeline is empty
            </div>
          )}
        </div>
      </div>

      {/* In-App Direct Real-time Chat Section */}
      <div className="space-y-3 pt-6 border-t border-gray-150 dark:border-slate-800">
        <h4 className="text-xs font-extrabold text-gray-400 dark:text-slate-400 uppercase tracking-widest">
          Direct Courier Coordinator Chat
        </h4>
        
        {showInAppChat ? (
          <ErrandChat
            errandId={errand.id}
            senderPhone={errand.phoneNumber}
            senderRole="student"
            senderName={errand.fullName}
            onClose={() => setShowInAppChat(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowInAppChat(true)}
            className="w-full py-4 bg-[#F4B400] hover:bg-[#DBA200] text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 stroke-[2.5px]" />
            Open Direct Chat with Courier Runner
          </button>
        )}
      </div>

      {/* Action coordination board */}
      <div className="pt-4 flex flex-col sm:flex-row gap-3">
        <a
          href="tel:+254700891519"
          className="flex-1 py-4 bg-[#0B6B3A] hover:bg-[#09572E] text-white font-bold text-xs uppercase tracking-wider rounded-xl text-center transition-all inline-block shadow-md shadow-[#0B6B3A]/10 cursor-pointer"
        >
          Call Coordinator Desk
        </a>
        <a
          href={`https://wa.me/254700891519?text=Hi%20there,%20I%20am%20checking%20the%20status%20of%20my%20CampusRunner%20order%20${errand.orderId}.`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-4 border border-[#0B6B3A] dark:border-[#32b56e] hover:bg-[#0B6B3A]/5 dark:hover:bg-[#32b56e]/5 text-[#0B6B3A] dark:text-[#32b56e] font-bold text-xs uppercase tracking-wider rounded-xl text-center transition-all cursor-pointer"
        >
          WhatsApp Coordinator
        </a>
      </div>
    </div>
  );
};

export default OrderTracking;

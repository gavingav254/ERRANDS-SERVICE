import React, { useState } from 'react';
import { Errand, ErrandCategory, ErrandUrgency, PaymentMethod, ErrandStatus } from '../types';
import { Plus, ChevronRight, Clock, PlusCircle, Check, Loader2, Phone, MessageSquare, CreditCard, Landmark } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import ErrandChat from './ErrandChat';

const accentYellow = '#F4B400';

interface StudentDashboardProps {
  userId: string;
  userPhoneNumber: string;
  errands: Errand[];
  loadingErrands: boolean;
  onErrandAdded: (newErrand: Errand) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({
  userId,
  userPhoneNumber,
  errands,
  loadingErrands,
  onErrandAdded
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'tracking'>('list');
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);
  const [showInAppChat, setShowInAppChat] = useState(false);

  // Form States
  const [category, setCategory] = useState<ErrandCategory>('Food');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [urgency, setUrgency] = useState<ErrandUrgency>('Normal');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash on Delivery');
  const [pendingCodeSubmit, setPendingCodeSubmit] = useState(false);
  const [txCode, setTxCode] = useState('');
  
  // Submit loading state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Runner Contact Info for manual dispatch
  const runnerPhone = "+254712345678"; // Embu Office Dispatch Number

  const handleSubmitErrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!description.trim() || !location.trim()) {
      setError('Description and location are required.');
      return;
    }

    setSubmitting(true);
    try {
      const errandId = 'errand_' + Math.random().toString(36).substring(2, 11);
      const parsedBudget = budget.trim() ? parseFloat(budget) : null;

      const newErrand: Errand = {
        id: errandId,
        userId: userId,
        userPhoneNumber: userPhoneNumber,
        category: category,
        description: description.trim(),
        location: location.trim(),
        budget: parsedBudget,
        urgency: urgency,
        paymentMethod: paymentMethod,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Write directly to Firestore with real validation rules
      const docRef = doc(db, 'errands', errandId);
      await setDoc(docRef, newErrand);

      // Reset Form fields
      onErrandAdded(newErrand);
      setDescription('');
      setLocation('');
      setBudget('');
      setCategory('Food');
      setUrgency('Normal');
      setPaymentMethod('Cash on Delivery');
      
      // Go back to list
      setActiveTab('list');
    } catch (err) {
      setError('Failed to post the request. Please try again.');
      handleFirestoreError(err, OperationType.CREATE, 'errands');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTxCode = async (e: React.FormEvent, errandId: string) => {
    e.preventDefault();
    if (!txCode.trim()) return;

    setPendingCodeSubmit(true);
    try {
      const errandRef = doc(db, 'errands', errandId);
      await updateDoc(errandRef, {
        mpesaTransactionCode: txCode.trim().toUpperCase(),
        updatedAt: new Date().toISOString()
      });
      
      // Sync local object
      if (selectedErrand) {
        setSelectedErrand(prev => prev ? { ...prev, mpesaTransactionCode: txCode.trim().toUpperCase() } : null);
      }
      setTxCode('');
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `errands/${errandId}`);
    } finally {
      setPendingCodeSubmit(false);
    }
  };

  const viewTracking = (errand: Errand) => {
    setSelectedErrand(errand);
    setActiveTab('tracking');
  };

  // Status Progression bar configuration
  const statusSteps: ErrandStatus[] = ['Pending', 'Awaiting Payment', 'Shopping', 'On the way', 'Delivered'];

  const getStatusStepIndex = (currentStatus: ErrandStatus) => {
    if (currentStatus === 'Accepted') return 1;
    return statusSteps.indexOf(currentStatus);
  };

  return (
    <div className="max-w-md mx-auto px-6 py-4 animate-in fade-in duration-300">
      
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Headline summary banner */}
          <div className="bg-[#0B6B3A]/5 border border-[#0B6B3A]/20 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold uppercase text-[#0B6B3A] tracking-wider">
                Reliable Deliveries
              </h2>
              <p className="text-gray-500 text-[11px] font-medium leading-none mt-1">
                Have requests? Our runner operates across campus daily.
              </p>
            </div>
            
            {/* Action button */}
            <button
              id="btn-goto-create"
              onClick={() => setActiveTab('create')}
              className="py-2.5 px-4 bg-[#0B6B3A] hover:bg-[#0B6B3A]/95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#F4B400]" />
              New Errand
            </button>
          </div>

          {/* Errand Inventory */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
              Your Errands ({errands.length})
            </h3>

            {loadingErrands ? (
              <div className="border border-gray-100 bg-white rounded-2xl py-12 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 text-[#0B6B3A] animate-spin" />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Loading orders...</span>
              </div>
            ) : errands.length === 0 ? (
              <div className="border-2 border-dashed border-gray-150 bg-white rounded-2xl py-16 text-center">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                  Your history is empty.<br />Post an errand above to begin!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {errands.map((errand) => {
                  const urgentColor = errand.urgency === 'ASAP' ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50';
                  return (
                    <div
                      key={errand.id}
                      style={{ borderLeftColor: errand.status === 'Delivered' ? '#0B6B3A' : '#F4B400' }}
                      className="bg-white border border-gray-150 border-l-4 rounded-xl p-4 flex items-center justify-between shadow-sm hover:translate-x-0.5 transition-all"
                    >
                      <div className="space-y-1 flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-extrabold uppercase bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded">
                            {errand.category}
                          </span>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${urgentColor}`}>
                            {errand.urgency}
                          </span>
                        </div>
                        
                        <p className="text-xs font-bold text-gray-800 truncate">
                          {errand.description}
                        </p>
                        
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                          <span>{errand.location}</span>
                          {errand.budget && (
                            <>
                              <span>&bull;</span>
                              <span className="font-bold text-[#0B6B3A]">KSh {errand.budget}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${
                          errand.status === 'Delivered' ? 'bg-[#0B6B3A]/10 text-[#0B6B3A]' : 'bg-[#F4B400]/10 text-orange-700'
                        }`}>
                          {errand.status}
                        </span>
                        
                        <button
                          onClick={() => viewTracking(errand)}
                          className="flex items-center text-[10px] font-bold text-[#0B6B3A] uppercase tracking-wider hover:underline"
                        >
                          View
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'create' && (
        <div className="space-y-6 animate-in slide-in-from-right duration-250">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">
              Post New Errand
            </h2>
            <button
              onClick={() => setActiveTab('list')}
              className="text-xs font-bold text-[#0B6B3A] uppercase tracking-wider hover:underline"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold rounded-r-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitErrand} className="space-y-5">
            
            {/* Category selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                Category
              </label>
              <select
                id="select-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ErrandCategory)}
                className="w-full py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0B6B3A] outline-none text-xs font-bold text-gray-700"
              >
                <option value="Food">Food</option>
                <option value="Groceries">Groceries</option>
                <option value="Printing">Printing</option>
                <option value="Airtime/Data">Airtime/Data</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Description input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                Description of Errand
              </label>
              <textarea
                id="input-description"
                rows={3}
                required
                placeholder="Example: Buy bread and milk from supermarket"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0B6B3A] outline-none text-xs font-medium text-gray-700 leading-relaxed"
              />
            </div>

            {/* Location Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                Delivery Location
              </label>
              <input
                id="input-location"
                type="text"
                required
                placeholder="Example: Hostel Room 112"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0B6B3A] outline-none text-xs font-bold text-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Optional Budget */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                  Budget (Optional KSh)
                </label>
                <input
                  id="input-budget"
                  type="number"
                  placeholder="e.g. 150"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full py-3.5 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0B6B3A] outline-none text-xs font-bold font-mono text-gray-700"
                />
              </div>

              {/* Urgency selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                  Urgency Level
                </label>
                <div className="grid grid-cols-2 gap-2 h-[48px]">
                  <button
                    type="button"
                    onClick={() => setUrgency('Normal')}
                    className={`h-full border rounded-xl text-xs font-bold uppercase transition-all ${
                      urgency === 'Normal'
                        ? 'border-[#0B6B3A] bg-[#0B6B3A]/5 text-[#0B6B3A]'
                        : 'border-gray-250 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgency('ASAP')}
                    className={`h-full border rounded-xl text-xs font-bold uppercase transition-all ${
                      urgency === 'ASAP'
                        ? 'border-red-600 bg-red-50 text-red-600'
                        : 'border-gray-250 text-gray-500 hover:border-gray-500'
                    }`}
                  >
                    ASAP
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Method selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash on Delivery')}
                  className={`p-3 border-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'Cash on Delivery'
                      ? 'border-[#0B6B3A] bg-[#0B6B3A]/5 text-[#0B6B3A] font-bold'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">Cash Office</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('M-Pesa')}
                  className={`p-3 border-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'M-Pesa'
                      ? 'border-[#0B6B3A] bg-[#0B6B3A]/5 text-[#0B6B3A] font-bold'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wide">M-Pesa Pay</span>
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              id="submit-errand"
              type="submit"
              disabled={submitting}
              className="w-full py-4 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: accentYellow, color: '#111' }}
            >
              {submitting ? 'Submitting Errand Request...' : 'Submit Errand Request'}
              <PlusCircle className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {activeTab === 'tracking' && selectedErrand && (
        <div className="space-y-6 animate-in slide-in-from-right duration-250">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-[#0B6B3A] uppercase tracking-wider">
              Order Status Tracker
            </h2>
            <button
              onClick={() => {
                setSelectedErrand(null);
                setActiveTab('list');
                setShowInAppChat(false);
              }}
              className="text-xs font-bold text-gray-500 uppercase tracking-wider hover:underline"
            >
              Back to List
            </button>
          </div>

          {/* Errand details Summary */}
          <div className="bg-gray-50 p-5 rounded-2xl space-y-4 border border-gray-150">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded">
                  {selectedErrand.category}
                </span>
                <h3 className="text-sm font-bold text-gray-800 mt-2">
                  {selectedErrand.description}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Budget</span>
                <span className="text-xs font-extrabold text-[#0B6B3A]">
                  {selectedErrand.budget ? `KSh ${selectedErrand.budget}` : 'Flexible'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200 text-xs">
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Destination</span>
                <span className="font-bold text-gray-700">{selectedErrand.location}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 font-bold uppercase block tracking-wider">Posted At</span>
                <span className="font-bold text-gray-700">{new Date(selectedErrand.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          </div>

          {/* Real-time status progression bar */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest pl-1">
              Fulfillment Pipeline
            </h4>
            
            <div className="space-y-4 relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
              {statusSteps.map((step, idx) => {
                const currentIdx = getStatusStepIndex(selectedErrand.status);
                const isActive = idx === currentIdx;
                const isCompleted = idx < currentIdx;

                return (
                  <div key={step} className="relative flex items-center justify-between">
                    {/* Circle Node indicator */}
                    <div className={`absolute left-[-29px] w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-[#0B6B3A] border-[#0B6B3A] text-white animate-pulse'
                        : isCompleted
                        ? 'bg-[#0B6B3A] border-[#0B6B3A] text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      ) : (
                        <span className="text-[9px] font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step label description */}
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-wider ${
                        isActive ? 'text-[#0B6B3A]' : isCompleted ? 'text-gray-800' : 'text-gray-400'
                      }`}>
                        {step}
                      </p>
                      <p className="text-[9px] text-gray-400 font-medium">
                        {step === 'Pending' && 'Evaluating current queue and assigning dispatch'}
                        {step === 'Accepted' && 'Runner verified request and preparing logs'}
                        {step === 'Shopping' && 'Procuring items at campus outlets'}
                        {step === 'On the way' && 'Transit to target hostel destination'}
                        {step === 'Delivered' && 'Errand is successfully signed and complete'}
                      </p>
                    </div>

                    {/* Highlight label */}
                    {isActive && (
                      <span className="text-[8px] font-black uppercase text-white bg-[#0B6B3A] px-2.5 py-0.5 rounded-full tracking-widest shrink-0 animate-ping absolute right-0 opacity-20" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment execution display panel */}
          <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl space-y-4 mt-6">
            <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider">
              Operational Payment Box
            </h4>

            {selectedErrand.paymentMethod === 'M-Pesa' ? (
              <div className="space-y-4">
                <div className="space-y-1 text-xs">
                  <p className="text-gray-500 font-semibold leading-relaxed">
                    Please send the negotiated payment manual transfer to:
                  </p>
                  <p className="text-base font-extrabold text-[#0B6B3A] font-mono leading-none pt-1">
                    0712 345 678
                  </p>
                  <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider pt-1">
                    Registered Name: CampusRunner Mobile Office
                  </p>
                </div>

                {!selectedErrand.mpesaTransactionCode ? (
                  <form onSubmit={(e) => handleUpdateTxCode(e, selectedErrand.id)} className="space-y-2.5">
                    <label className="block text-[9px] text-orange-850 font-black uppercase tracking-wider">
                      Optionally enter transaction transaction code:
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="tx-code-input"
                        type="text"
                        placeholder="e.g. QXJ893HDJK"
                        value={txCode}
                        onChange={(e) => setTxCode(e.target.value)}
                        className="flex-1 py-2 px-3 border border-gray-300 rounded-xl focus:border-[#0B6B3A] uppercase tracking-widest font-mono text-xs outline-none bg-white font-bold"
                      />
                      <button
                        type="submit"
                        disabled={pendingCodeSubmit}
                        className="py-2.5 px-4 bg-[#0B6B3A] hover:bg-[#0B6B3A]/95 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                      >
                        {pendingCodeSubmit ? 'Saving...' : 'Add'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 bg-[#0B6B3A]/5 rounded-xl border border-[#0B6B3A]/20 flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-bold uppercase text-[9px] tracking-wider">Transfer Code Added</span>
                    <span className="font-mono font-bold text-[#0B6B3A] tracking-wider bg-white py-1 px-2.5 border border-[#0B6B3A]/20 rounded">
                      {selectedErrand.mpesaTransactionCode}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0B6B3A]/10 flex items-center justify-center text-[#0B6B3A] shrink-0">
                  <Check className="w-4 h-4 stroke-[3px]" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-gray-850 uppercase tracking-wide">Cash on Delivery selected</p>
                  <p className="text-gray-400 mt-1 leading-normal font-medium">Please hand physical currency over to the courier representative directly upon delivery of products.</p>
                </div>
              </div>
            )}
          </div>

          {/* In-App Direct Real-time Chat Section */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest pl-1">
              Direct Courier Chat
            </h4>
            
            {showInAppChat ? (
              <ErrandChat
                errandId={selectedErrand.id}
                senderPhone={userPhoneNumber}
                senderRole="student"
                onClose={() => setShowInAppChat(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowInAppChat(true)}
                className="w-full py-4 bg-[#F4B400] hover:bg-[#DBA200] text-slate-900 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 stroke-[2.5px]" />
                Open In-App Direct Chat
              </button>
            )}
          </div>

          {/* Quick contacting runner action list */}
          <div className="grid grid-cols-2 gap-4">
            <a
              href={`tel:${runnerPhone}`}
              className="py-3.5 border-2 border-gray-200 hover:border-gray-350 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl text-center transition-all flex items-center justify-center gap-2 bg-white"
            >
              <Phone className="w-4 h-4 text-[#0B6B3A]" />
              Call Dispatcher
            </a>
            <a
              href={`https://wa.me/254712345678`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 border-2 border-gray-200 hover:border-gray-350 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-xl text-center transition-all flex items-center justify-center gap-2 bg-white"
            >
              <MessageSquare className="w-4 h-4 text-[#0B6B3A]" />
              WhatsApp Office
            </a>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;

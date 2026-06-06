import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Message } from '../types';
import { Send, MessageSquare, Loader2, User, ShieldAlert } from 'lucide-react';

interface ErrandChatProps {
  errandId: string;
  senderPhone: string;
  senderRole: 'student' | 'runner';
  senderName: string;
  onClose?: () => void;
}

const ErrandChat: React.FC<ErrandChatProps> = ({
  errandId,
  senderPhone,
  senderRole,
  senderName,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to lowest message
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time listener for messages in the subcollection
  useEffect(() => {
    setLoading(true);
    setError(null);
    const messagesPath = `errands/${errandId}/messages`;
    const q = query(
      collection(db, messagesPath),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedMessages: Message[] = [];
        snapshot.forEach((docSnap) => {
          loadedMessages.push(docSnap.data() as Message);
        });
        setMessages(loadedMessages);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to messages:', err);
        setError('Connection issue accessing direct chat. Please refresh.');
        setLoading(false);
        // Explicitly format and throw permission error as required by Firestore error handling guidelines
        handleFirestoreError(err, OperationType.LIST, messagesPath);
      }
    );

    return () => unsubscribe();
  }, [errandId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setError(null);

    const textToSend = newMessage.trim();
    const messageId = 'msg_' + Math.random().toString(36).substring(2, 11);
    const writePath = `errands/${errandId}/messages/${messageId}`;

    // Payload strictly matching security rules requirements
    const payload: Message = {
      id: messageId,
      senderPhone: senderPhone,
      senderRole: senderRole,
      senderName: senderName,
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'errands', errandId, 'messages', messageId), payload);
      setNewMessage('');
    } catch (err) {
      console.error('Error writing chat message:', err);
      setError('Failed to send message. Please try again.');
      // Execute required handleFirestoreError behavior
      handleFirestoreError(err, OperationType.WRITE, writePath);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden h-[450px] animate-in fade-in duration-200 transition-colors duration-200">
      {/* Mini Chat Header */}
      <div className="bg-[#0B6B3A] dark:bg-[#0B6B3A] px-4 py-3.5 flex justify-between items-center text-white shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#F4B400]" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider">
              Real-time Errand Chat
            </h4>
            <p className="text-[9px] text-white/70 font-semibold leading-none">
              Direct line between student and runner
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 px-2 py-1 rounded text-xs font-bold uppercase transition-all"
          >
            Hide
          </button>
        )}
      </div>

      {/* Message Screen Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-[350px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2 py-12">
            <Loader2 className="w-6 h-6 text-[#0B6B3A] animate-spin" />
            <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              Connecting chat...
            </span>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold p-4 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            <div>
              <p className="font-extrabold uppercase text-[9px] tracking-wider text-red-800 dark:text-red-400">
                Connection Blocked
              </p>
              <p className="mt-0.5 font-medium leading-relaxed">{error}</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-gray-400 dark:text-slate-500">
            <MessageSquare className="w-8 h-8 text-gray-300 dark:text-slate-750 mb-2" />
            <span className="text-xs font-bold uppercase tracking-wide">
              No messages yet
            </span>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 max-w-[200px] leading-relaxed mx-auto font-medium">
              Start typing below to coordinate pickup times or instructions synchronously.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            // Determine if the message was sent by the current active role/phone setup
            const isMe = msg.senderPhone === senderPhone && msg.senderRole === senderRole;
            const isRunnerMessage = msg.senderRole === 'runner';

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                {/* Sender badge if not me */}
                {!isMe && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1 px-1 flex items-center gap-1">
                    {isRunnerMessage ? (
                      <span className="bg-[#F4B400] text-slate-900 px-1.5 py-0.5 rounded text-[8px] font-black">
                        RUNNER
                      </span>
                    ) : (
                      <span className="bg-[#0B6B3A] text-white px-1.5 py-0.5 rounded text-[8px] font-extrabold">
                        STUDENT
                      </span>
                    )}
                    <span className="text-gray-600 dark:text-slate-350 font-semibold">{msg.senderName || msg.senderPhone}</span>
                  </span>
                )}

                {/* Bubble content */}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                    isMe
                      ? 'bg-[#0B6B3A] text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border border-gray-150 dark:border-slate-750 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                </div>

                {/* Sent time */}
                <span className="text-[8px] font-semibold text-gray-400 dark:text-slate-500 mt-1 px-1 font-mono">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Sender text fields form */}
      <form
        onSubmit={handleSendMessage}
        className="shrink-0 p-3 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-850 flex gap-2 items-center"
      >
        <input
          type="text"
          maxLength={1000}
          required
          disabled={loading || !!error || sending}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={
            error
              ? 'Chat disabled due to connection error'
              : 'Write message to runner/student...'
          }
          className="flex-1 py-2.5 px-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 text-xs font-semibold text-gray-900 dark:text-white outline-none transition-all"
        />
        <button
          type="submit"
          disabled={loading || !!error || sending || !newMessage.trim()}
          className="w-10 h-10 bg-[#0B6B3A] hover:bg-[#09572E] text-white disabled:opacity-40 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4 stroke-[2.5px]" />
          )}
        </button>
      </form>
    </div>
  );
};

export default ErrandChat;

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, MessageSquare, Send, Plus, CheckCircle2, Clock, 
  ChevronRight, ArrowLeft, RefreshCw, AlertCircle
} from 'lucide-react';
import { fetchFromApi, getAuthToken } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { StyledSelect } from './StyledSelect';

interface TicketMessage {
  id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface TicketItem {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  latest_message?: string;
  target_role: string;
}

interface UserTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireLogin?: () => void;
}

export function UserTicketsModal({ isOpen, onClose, onRequireLogin }: UserTicketsModalProps) {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // New Ticket Mode
  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Body overflow locking and Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const loadUserTickets = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchFromApi<{ tickets: TicketItem[] }>('/api/v1/tickets?limit=20');
      setTickets(res.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadUserTickets();
      setSelectedTicket(null);
      setIsCreating(false);
    }
  }, [isOpen, loadUserTickets]);

  const handleOpenTicket = async (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    setMessagesLoading(true);
    try {
      const res = await fetchFromApi<{ ticket: TicketItem; messages: TicketMessage[] }>(
        `/api/v1/tickets/${ticket.id}`
      );
      setSelectedTicket(res.ticket);
      setMessages(res.messages || []);
    } catch {
      showDynamicToast({ title: 'خطا در بارگذاری پیام‌ها', type: 'error' });
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const res = await fetchFromApi<{ message: TicketMessage; new_status: string }>(
        `/api/v1/tickets/${selectedTicket.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ message: replyText.trim() })
        }
      );
      setMessages((prev) => [...prev, res.message]);
      setSelectedTicket((prev) => (prev ? { ...prev, status: res.new_status } : null));
      setReplyText('');
      showDynamicToast({ title: 'پیام شما ارسال شد', type: 'success' });
    } catch {
      showDynamicToast({ title: 'خطا در ارسال پیام', type: 'error' });
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      await fetchFromApi('/api/v1/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          message: message.trim()
        })
      });
      showDynamicToast({ title: 'تیکت شما با موفقیت ثبت شد', type: 'success' });
      setIsCreating(false);
      setSubject('');
      setMessage('');
      loadUserTickets();
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در ثبت تیکت',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const token = getAuthToken();

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md w-screen h-screen animate-fade-in"
    >
      <div className="glass-panel w-full max-w-2xl bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">پشتیبانی و تیکت‌ها</h3>
              <p className="text-[11px] text-slate-500">ارتباط مستقیم با تیم پشتیبانی و اپراتورهای پوروشکا</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Not Logged In State */}
        {!token ? (
          <div className="py-16 text-center space-y-4 my-auto">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">برای ارسال تیکت باید وارد حساب خود شوید</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              لطفاً با شماره موبایل خود وارد شوید تا پاسخ تیکت‌های شما محفوظ بماند.
            </p>
            <button
              onClick={() => {
                onClose();
                if (onRequireLogin) onRequireLogin();
              }}
              className="pressable px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/20"
            >
              ورود به حساب کاربری
            </button>
          </div>
        ) : isCreating ? (
          /* Create Ticket View */
          <form onSubmit={handleCreateTicket} className="space-y-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800">ثبت تیکت پشتیبانی جدید</span>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                بازگشت به لیست
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">موضوع تیکت *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="مثلاً: سوال در مورد نحوه خروجی پرامپت کدنویسی"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">دسته‌بندی موضوع</label>
              <StyledSelect
                size="md"
                value={category}
                onChange={setCategory}
                options={[
                  { value: 'general', label: 'عمومی و راهنمایی' },
                  { value: 'technical', label: 'مسائل فنی و عملکرد' },
                  { value: 'prompt_request', label: 'درخواست پرامپت اختصاصی' },
                  { value: 'feedback', label: 'پیشنهادات و انتقادات' }
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">شرح پیام *</label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="جزئیات پیام خود را بنویسید..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="pressable px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="pressable px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
              >
                {submitting ? 'در حال ارسال...' : 'ارسال تیکت'}
              </button>
            </div>
          </form>
        ) : selectedTicket ? (
          /* Conversation Thread View */
          <div className="flex flex-col flex-1 min-h-[400px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900">{selectedTicket.subject}</h4>
                <span className="text-[10px] text-slate-400">
                  وضعیت: {selectedTicket.status === 'CLOSED' ? 'بسته شده' : selectedTicket.status === 'ANSWERED' ? 'پاسخ داده شده' : 'در انتظار بررسی'}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="pressable text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <ChevronRight className="w-4 h-4" />
                <span>همه تیکت‌ها</span>
              </button>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-slate-50/60 rounded-2xl mb-3">
              {messagesLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">در حال دریافت پاسخ‌ها...</div>
              ) : messages.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">پیامی ثبت نشده است.</div>
              ) : (
                messages.map((m) => {
                  const isStaff = m.sender_role === 'ADMIN' || m.sender_role === 'OPERATOR';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[85%] ${isStaff ? 'mr-auto items-start' : 'ml-auto items-end'}`}
                    >
                      <span className="text-[10px] text-slate-400 mb-0.5">
                        {isStaff ? 'پشتیبانی پوروشکا' : 'شما'} • {new Date(m.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isStaff ? 'bg-blue-600 text-white rounded-br-none shadow-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-2xs'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendReply} className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="پاسخ خود را بنویسید..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={sendingReply || !replyText.trim()}
                className="pressable px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ارسال</span>
              </button>
            </form>
          </div>
        ) : (
          /* User Tickets List View */
          <div className="flex flex-col flex-1 min-h-[350px]">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700">تیکت‌های ارسالی شما</span>
              <button
                onClick={() => setIsCreating(true)}
                className="pressable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ارسال تیکت جدید</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">در حال دریافت تیکت‌ها...</div>
              ) : tickets.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <p>شما هنوز تیکتی ارسال نکرده‌اید.</p>
                </div>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleOpenTicket(t)}
                    className="w-full py-3 px-2 text-right hover:bg-slate-50 rounded-xl transition cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1 mb-0.5">{t.subject}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{t.latest_message || 'مشاهده گفتگو...'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'CLOSED'
                            ? 'bg-slate-100 text-slate-500'
                            : t.status === 'ANSWERED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {t.status === 'CLOSED' ? 'بسته شده' : t.status === 'ANSWERED' ? 'پاسخ داده شده' : 'در انتظار پاسخ'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

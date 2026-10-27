'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MessageSquare, Send, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, 
  Search, Filter, Plus, ShieldCheck, User, Clock, ArrowUpRight, Lock, RefreshCw, X
} from 'lucide-react';
import { fetchFromApi } from '../lib/api-client';
import { showDynamicToast } from './DynamicIslandToast';
import { StyledSelect } from './StyledSelect';

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: string;
  sender_phone?: string;
  message: string;
  created_at: string;
}

export interface TicketItem {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string; // 'OPEN' | 'ANSWERED' | 'CLOSED'
  target_role: string; // 'OPERATOR' | 'ADMIN'
  last_message_at: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  creator_phone: string;
  creator_role: string;
  message_count: number;
  latest_message?: string;
}

interface TicketsApiResponse {
  tickets: TicketItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface AdminTicketsViewProps {
  currentUserRole?: 'ADMIN' | 'OPERATOR' | string;
}

export function AdminTicketsView({ currentUserRole = 'ADMIN' }: AdminTicketsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL search params for page refresh persistence
  const initialPage = Math.max(1, parseInt(searchParams.get('ticket_page') || '1', 10));
  const initialStatus = searchParams.get('ticket_status') || 'open';
  const initialRole = searchParams.get('ticket_role') || 'all';
  const initialSearch = searchParams.get('ticket_q') || '';

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // New Ticket Modal State (Operators to Admins or Support)
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newTargetRole, setNewTargetRole] = useState(currentUserRole === 'OPERATOR' ? 'ADMIN' : 'OPERATOR');
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Filter & Pagination State
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [targetRoleFilter, setTargetRoleFilter] = useState(initialRole);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const updateUrlParams = useCallback((p: number, st: string, role: string, q: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('tab');
    if (p > 1) params.set('ticket_page', String(p));
    else params.delete('ticket_page');

    if (st !== 'open') params.set('ticket_status', st);
    else params.delete('ticket_status');

    if (role !== 'all') params.set('ticket_role', role);
    else params.delete('ticket_role');

    if (q.trim()) params.set('ticket_q', q.trim());
    else params.delete('ticket_q');

    const qs = params.toString();
    router.replace(`/admin/tickets${qs ? `?${qs}` : ''}`);
  }, [router, searchParams]);

  // Synchronize state when URL search params change (e.g. browser back/forward or reload)
  useEffect(() => {
    const p = Math.max(1, parseInt(searchParams.get('ticket_page') || '1', 10));
    const st = searchParams.get('ticket_status') || 'open';
    const role = searchParams.get('ticket_role') || 'all';
    const q = searchParams.get('ticket_q') || '';

    setPage(p);
    setStatusFilter(st);
    setTargetRoleFilter(role);
    setSearchQuery(q);
  }, [searchParams]);

  // Modal overflow locking for new ticket modal
  useEffect(() => {
    if (!isNewTicketOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNewTicketOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isNewTicketOpen]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (targetRoleFilter !== 'all') params.set('target_role', targetRoleFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetchFromApi<TicketsApiResponse>(`/api/v1/tickets?${params.toString()}`);
      setTickets(res.tickets || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در دریافت لیست تیکت‌ها',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, targetRoleFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadTickets]);

  // Load Ticket Details & Messages
  const handleSelectTicket = async (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    setMessagesLoading(true);
    try {
      const res = await fetchFromApi<{ ticket: TicketItem; messages: TicketMessage[] }>(
        `/api/v1/tickets/${ticket.id}`
      );
      setSelectedTicket(res.ticket);
      setMessages(res.messages || []);
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در بارگذاری پیام‌های تیکت',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    } finally {
      setMessagesLoading(false);
    }
  };

  // Send Reply
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
      showDynamicToast({ title: 'پاسخ ارسال شد', type: 'success' });
      loadTickets();
    } catch (err: unknown) {
      showDynamicToast({
        title: 'خطا در ارسال پاسخ',
        message: err instanceof Error ? err.message : '',
        type: 'error'
      });
    } finally {
      setSendingReply(false);
    }
  };

  // Elevate Ticket to Admins
  const handleElevateTicket = async (ticketId: string) => {
    try {
      await fetchFromApi(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ target_role: 'ADMIN' })
      });
      showDynamicToast({ title: 'تیکت به مدیران ارشد ارجاع داده شد', type: 'auth' });
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, target_role: 'ADMIN' } : null));
      }
      loadTickets();
    } catch (err: unknown) {
      showDynamicToast({ title: 'خطا در ارجاع تیکت', message: err instanceof Error ? err.message : '', type: 'error' });
    }
  };

  // Close or Reopen Ticket
  const handleToggleStatus = async (ticketId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'CLOSED' ? 'OPEN' : 'CLOSED';
    try {
      await fetchFromApi(`/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      showDynamicToast({
        title: newStatus === 'CLOSED' ? 'تیکت بسته شد' : 'تیکت مجدداً باز شد',
        type: 'success'
      });
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      loadTickets();
    } catch (err: unknown) {
      showDynamicToast({ title: 'خطا در تغییر وضعیت تیکت', message: err instanceof Error ? err.message : '', type: 'error' });
    }
  };

  // Create New Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    setCreatingTicket(true);
    try {
      await fetchFromApi('/api/v1/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: newSubject.trim(),
          message: newMessage.trim(),
          priority: newPriority,
          target_role: newTargetRole
        })
      });
      showDynamicToast({ title: 'تیکت با موفقیت ایجاد شد', type: 'success' });
      setIsNewTicketOpen(false);
      setNewSubject('');
      setNewMessage('');
      loadTickets();
    } catch (err: unknown) {
      showDynamicToast({ title: 'خطا در ثبت تیکت', message: err instanceof Error ? err.message : '', type: 'error' });
    } finally {
      setCreatingTicket(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>سیستم تیکتینگ و پشتیبانی</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">
              {totalCount.toLocaleString('fa-IR')}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            پاسخگویی به درخواست‌های کاربران، ارجاع تیکت‌ها به مدیران ارشد و تبادل پیام میان اپراتورها و ادمین‌ها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadTickets()}
            className="pressable p-2.5 rounded-2xl bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50 shadow-xs"
            title="به‌روزرسانی لیست"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsNewTicketOpen(true)}
            className="pressable inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>
              {currentUserRole === 'OPERATOR' ? 'ارسال تیکت به مدیران ارشد' : 'ایجاد تیکت پشتیبانی'}
            </span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-200/80 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const q = e.target.value;
              setSearchQuery(q);
              setPage(1);
              updateUrlParams(1, statusFilter, targetRoleFilter, q);
            }}
            placeholder="جستجو در موضوع یا شماره کاربر..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pr-10 pl-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <div className="w-40">
            <StyledSelect
              size="sm"
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
                updateUrlParams(1, val, targetRoleFilter, searchQuery);
              }}
              options={[
                { value: 'all', label: 'همه تیکت‌ها' },
                { value: 'open', label: 'تیکت‌های باز' },
                { value: 'closed', label: 'تیکت‌های بسته‌شده' }
              ]}
            />
          </div>

          {/* Target Role Filter */}
          <div className="w-44">
            <StyledSelect
              size="sm"
              value={targetRoleFilter}
              onChange={(val) => {
                setTargetRoleFilter(val);
                setPage(1);
                updateUrlParams(1, statusFilter, val, searchQuery);
              }}
              options={[
                { value: 'all', label: 'همه ارجاعات' },
                { value: 'OPERATOR', label: 'پشتیبانی اپراتور' },
                { value: 'ADMIN', label: 'مدیریت ارشد (Admin)' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Tickets List & Conversation Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ticket List (Left on RTL, 5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs divide-y divide-slate-100">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-between">
            <span>لیست تیکت‌ها ({totalCount.toLocaleString('fa-IR')})</span>
            <span className="text-[10px] text-slate-400 font-normal">بسته شدن خودکار بعد از ۳ روز بی‌تحرکی</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>در حال بارگذاری تیکت‌ها...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              تیکتی در این بخش وجود ندارد.
            </div>
          ) : (
            tickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const isClosed = t.status === 'CLOSED';
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={`w-full p-4 text-right transition cursor-pointer flex flex-col gap-1.5 ${
                    isSelected ? 'bg-blue-50/70 border-r-4 border-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs line-clamp-1">
                      {t.subject}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isClosed
                          ? 'bg-slate-100 text-slate-600'
                          : t.status === 'ANSWERED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isClosed ? 'بسته شده' : t.status === 'ANSWERED' ? 'پاسخ داده شد' : 'در انتظار پاسخ'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {t.latest_message || 'بدون پیام'}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span className="font-mono" dir="ltr">{t.creator_phone}</span>
                    <div className="flex items-center gap-1.5">
                      {t.target_role === 'ADMIN' && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">
                          مدیر ارشد
                        </span>
                      )}
                      <span>{new Date(t.created_at).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">
                {page} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const newPage = Math.max(1, page - 1);
                    setPage(newPage);
                    updateUrlParams(newPage, statusFilter, targetRoleFilter, searchQuery);
                  }}
                  disabled={page <= 1}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const newPage = Math.min(totalPages, page + 1);
                    setPage(newPage);
                    updateUrlParams(newPage, statusFilter, targetRoleFilter, searchQuery);
                  }}
                  disabled={page >= totalPages}
                  className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Conversation Thread (Right on RTL, 7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          {!selectedTicket ? (
            <div className="py-32 text-center text-slate-400 text-xs space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">یک تیکت را برای مشاهده و پاسخ انتخاب کنید</p>
            </div>
          ) : (
            <div className="flex flex-col h-[650px]">
              {/* Ticket Top Action Bar */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                    <span>ارسال‌کننده: {selectedTicket.creator_phone}</span>
                    <span>•</span>
                    <span>ارجاع: {selectedTicket.target_role === 'ADMIN' ? 'مدیر ارشد' : 'اپراتور'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Elevate to Admin Button (for Operators) */}
                  {selectedTicket.target_role !== 'ADMIN' && (
                    <button
                      onClick={() => handleElevateTicket(selectedTicket.id)}
                      className="pressable inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200/70"
                      title="ارجاع به مدیران ارشد سیستم"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>ارجاع به مدیر ارشد</span>
                    </button>
                  )}

                  {/* Close / Reopen Toggle */}
                  <button
                    onClick={() => handleToggleStatus(selectedTicket.id, selectedTicket.status)}
                    className={`pressable px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                      selectedTicket.status === 'CLOSED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {selectedTicket.status === 'CLOSED' ? 'بازگشایی مجدد تیکت' : 'بستن تیکت'}
                  </button>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
                {messagesLoading ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    در حال دریافت پیام‌های تیکت...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    هنوز پیامی در این تیکت ثبت نشده است.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.sender_role === 'ADMIN' || msg.sender_role === 'OPERATOR';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] ${
                          isStaff ? 'mr-auto items-start' : 'ml-auto items-end'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-500">
                          <span className="font-bold">
                            {msg.sender_role === 'ADMIN'
                              ? 'مدیر ارشد سیستم'
                              : msg.sender_role === 'OPERATOR'
                              ? 'اپراتور پشتیبانی'
                              : 'کاربر'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(msg.created_at).toLocaleTimeString('fa-IR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isStaff
                              ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-2xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input Form */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-slate-200 bg-white flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    selectedTicket.status === 'CLOSED'
                      ? 'تیکت بسته شده است. با ارسال پیام مجدداً باز می‌شود...'
                      : 'پاسخ خود را بنویسید...'
                  }
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
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNewTicketOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md w-screen h-screen animate-fade-in"
        >
          <div className="glass-panel w-full max-w-lg bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {currentUserRole === 'OPERATOR' ? 'ارسال تیکت / گزارش به مدیران ارشد' : 'ایجاد تیکت پشتیبانی'}
              </h3>
              <button
                onClick={() => setIsNewTicketOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">موضوع تیکت *</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="مثلاً: درخواست افزایش سقف بودجه، گزارش خطای زیرساخت..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اولویت</label>
                  <StyledSelect
                    size="md"
                    value={newPriority}
                    onChange={setNewPriority}
                    options={[
                      { value: 'LOW', label: 'کم' },
                      { value: 'MEDIUM', label: 'عادی' },
                      { value: 'HIGH', label: 'مهم' },
                      { value: 'URGENT', label: 'فوری / بحرانی' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ارجاع به</label>
                  <StyledSelect
                    size="md"
                    value={newTargetRole}
                    onChange={setNewTargetRole}
                    options={[
                      { value: 'ADMIN', label: 'مدیران ارشد (Admins)' },
                      { value: 'OPERATOR', label: 'اپراتورها (Operators)' }
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">متن تیکت *</label>
                <textarea
                  rows={4}
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="شرح کامل پیام یا درخواست..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="pressable px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="pressable px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  {creatingTicket ? 'در حال ثبت...' : 'ثبت تیکت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

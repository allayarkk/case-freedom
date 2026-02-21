"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Building2,
    MapPin,
    BrainCircuit,
    Clock,
    CheckCircle2,
    MessageSquare,
    ExternalLink,
    Route,
    ShieldAlert,
    ArrowRight,
} from 'lucide-react';
import { ticketService } from '@/services/api';

interface TicketDetailProps {
    ticketId: string | null;
    onClose: () => void;
}

export function TicketDetail({ ticketId, onClose }: TicketDetailProps) {
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (ticketId) {
            setLoading(true);
            ticketService.getTicketById(ticketId)
                .then(res => setTicket(res.data.data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        } else {
            setTicket(null);
        }
    }, [ticketId]);

    if (!ticketId) return null;

    const assignmentLog = ticket?.assignmentLogs?.[0];
    const reasonParts = assignmentLog?.reason?.split(' | ') || [];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex justify-end">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Slider Panel */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-4xl bg-[#111b21] h-full shadow-2xl flex flex-col border-l border-[#233642]"
                >
                    {/* Header */}
                    <div className="h-14 bg-[#182833] border-b border-[#233642] flex items-center px-6 justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[#5b6f7c] font-mono text-sm leading-none">#{ticketId.slice(-8).toUpperCase()}</span>
                            <div className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Обращение</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="text-[#5b6f7c] hover:text-white transition-colors">
                                <ExternalLink size={18} />
                            </button>
                            <button onClick={onClose} className="text-[#5b6f7c] hover:text-white transition-colors bg-[#0d161d] p-1.5 rounded-md border border-[#233642]">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex">
                        {/* Sidebar (Attributes) */}
                        <div className="w-80 border-r border-[#233642] bg-[#0d161d]/30 overflow-y-auto p-6 space-y-8 flex-shrink-0">
                            {/* Responsible section */}
                            <section>
                                <h4 className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-widest mb-4">Ответственные</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                                            {ticket?.manager?.fullName?.[0] || '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-[#cbd3d9]">{ticket?.manager?.fullName || 'Менеджер не назначен'}</span>
                                            <span className="text-[9px] text-[#5b6f7c] uppercase font-bold tracking-tight">
                                                {ticket?.manager?.position?.replace(/_/g, ' ') || 'Менеджер'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 opacity-80">
                                        <div className="w-8 h-8 rounded bg-[#182833] flex items-center justify-center text-[#5b6f7c]">
                                            <Building2 size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-[#cbd3d9]">{ticket?.office?.name || 'В очереди'}</span>
                                            <span className="text-[9px] text-[#5b6f7c] uppercase font-bold tracking-tight">Рабочая группа</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Client Segment */}
                            <section>
                                <h4 className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-widest mb-4">Информация о клиенте</h4>
                                <div className="space-y-4">
                                    <div className="p-3 bg-[#182833] rounded-lg border border-[#233642]">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] text-[#5b6f7c] font-bold">СЕГМЕНТ</span>
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ticket?.segment === 'VIP' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'}`}>
                                                {ticket?.segment || 'MASS'}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-[#cbd3d9] font-mono leading-relaxed truncate">{ticket?.clientGuid}</p>
                                    </div>
                                    <div className="space-y-3 px-1">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-[#5b6f7c]">Пол</span>
                                            <span className="text-[#cbd3d9]">{ticket?.gender || '—'}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-[#5b6f7c]">Дата рожд.</span>
                                            <span className="text-[#cbd3d9] font-mono">{ticket?.dateOfBirth ? new Date(ticket.dateOfBirth).toLocaleDateString() : '—'}</span>
                                        </div>
                                        <div className="flex items-start gap-2 text-[11px] pt-2">
                                            <MapPin size={14} className="text-[#5b6f7c] shrink-0 mt-0.5" />
                                            <span className="text-[#cbd3d9] leading-[1.4]">{ticket?.country}, {ticket?.city}, {ticket?.street} {ticket?.houseNumber}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-widest mb-4">AI Атрибуты</h4>
                                <div className="bg-[#182833]/50 p-4 rounded-lg border border-[#233642] divide-y divide-[#233642]">
                                    <div className="pb-3 flex justify-between items-center">
                                        <span className="text-[10px] text-[#5b6f7c]">Тип</span>
                                        <span className="text-[10px] font-black text-[#cbd3d9] uppercase">{ticket?.analysis?.type || '—'}</span>
                                    </div>
                                    <div className="py-3 flex justify-between items-center">
                                        <span className="text-[10px] text-[#5b6f7c]">Приоритет</span>
                                        <span className={`text-sm font-black ${(ticket?.analysis?.priority ?? 0) >= 8 ? 'text-red-400' :
                                            (ticket?.analysis?.priority ?? 0) >= 6 ? 'text-amber-400' : 'text-[#3489db]'
                                            }`}>P{ticket?.analysis?.priority || 0}</span>
                                    </div>
                                    <div className="py-3 flex justify-between items-center">
                                        <span className="text-[10px] text-[#5b6f7c]">Тональность</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ticket?.analysis?.sentiment === 'NEGATIVE' ? 'text-red-400 bg-red-400/10' :
                                            ticket?.analysis?.sentiment === 'POSITIVE' ? 'text-green-400 bg-green-400/10' : 'text-slate-400 bg-slate-400/10'
                                            }`}>{ticket?.analysis?.sentiment || '—'}</span>
                                    </div>
                                    <div className="pt-3 flex justify-between items-center">
                                        <span className="text-[10px] text-[#5b6f7c]">Язык</span>
                                        <span className="text-[10px] font-bold text-[#cbd3d9]">{ticket?.analysis?.language || 'RU'}</span>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Main Feed Area */}
                        <div className="flex-1 bg-[#111b21] overflow-y-auto custom-scrollbar flex flex-col">
                            <div className="p-8 pb-4">
                                {loading ? (
                                    <div className="animate-pulse space-y-4">
                                        <div className="h-20 bg-[#182833] rounded-xl" />
                                        <div className="h-40 bg-[#182833] rounded-xl" />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* AI Analysis Card */}
                                        <div className="bg-[#182833] border border-[#233642] p-6 rounded-xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 text-[#233642]">
                                                <BrainCircuit size={80} strokeWidth={1} />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="p-1.5 bg-primary/10 rounded flex items-center justify-center">
                                                        <CheckCircle2 size={16} className="text-primary" />
                                                    </div>
                                                    <h3 className="text-xs font-black text-white uppercase tracking-wider">AI Анализ завершен</h3>
                                                </div>
                                                <p className="text-base font-bold text-[#cbd3d9] leading-relaxed mb-4">
                                                    {ticket?.analysis?.summary || 'Система производит анализ обращения...'}
                                                </p>
                                                <div className="flex gap-2 flex-wrap">
                                                    <div className="bg-[#111b21]/50 px-3 py-1.5 rounded-lg border border-[#233642] text-[11px]">
                                                        <span className="text-[#5b6f7c]">Тип: </span>
                                                        <span className="text-[#cbd3d9] font-bold uppercase">{ticket?.analysis?.type || '—'}</span>
                                                    </div>
                                                    <div className="bg-[#111b21]/50 px-3 py-1.5 rounded-lg border border-[#233642] text-[11px]">
                                                        <span className="text-[#5b6f7c]">Приоритет: </span>
                                                        <span className={`font-bold ${(ticket?.analysis?.priority ?? 0) >= 8 ? 'text-red-400' : 'text-[#3489db]'}`}>
                                                            P{ticket?.analysis?.priority || 0}
                                                        </span>
                                                    </div>
                                                    <div className={`bg-[#111b21]/50 px-3 py-1.5 rounded-lg border border-[#233642] text-[11px] ${ticket?.analysis?.sentiment === 'NEGATIVE' ? 'border-red-500/30' :
                                                        ticket?.analysis?.sentiment === 'POSITIVE' ? 'border-green-500/30' : ''
                                                        }`}>
                                                        <span className="text-[#5b6f7c]">Тональность: </span>
                                                        <span className={`font-bold ${ticket?.analysis?.sentiment === 'NEGATIVE' ? 'text-red-400' :
                                                            ticket?.analysis?.sentiment === 'POSITIVE' ? 'text-green-400' : 'text-slate-400'
                                                            }`}>{ticket?.analysis?.sentiment || '—'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Routing Logic Card — Explainable */}
                                        <div className="bg-[#111b21] border border-primary/30 p-6 rounded-xl border-dashed">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="p-1.5 bg-primary/20 rounded flex items-center justify-center">
                                                    <Route size={16} className="text-primary" />
                                                </div>
                                                <h3 className="text-xs font-black text-primary uppercase tracking-wider">Логика маршрутизации FIRE</h3>
                                            </div>

                                            {reasonParts.length > 0 ? (
                                                <div className="space-y-3">
                                                    {reasonParts.map((part: string, i: number) => (
                                                        <div key={i} className="flex gap-3 items-start">
                                                            <div className="flex flex-col items-center gap-1 mt-1.5 shrink-0">
                                                                <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-primary' :
                                                                    i === reasonParts.length - 1 ? 'bg-emerald-400' : 'bg-[#3489db]'
                                                                    }`} />
                                                                {i < reasonParts.length - 1 && (
                                                                    <div className="w-[1px] h-4 bg-[#233642]" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-[12px] text-[#cbd3d9] leading-relaxed font-medium">
                                                                    {part.trim()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[12px] text-[#5b6f7c] italic">
                                                    Данные о маршрутизации недоступны.
                                                </p>
                                            )}
                                        </div>

                                        {/* Attachments */}
                                        {ticket?.attachments && (
                                            <div className="bg-[#182833]/30 border border-[#233642] p-4 rounded-xl">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <ShieldAlert size={14} className="text-amber-400" />
                                                    <h3 className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-widest">Вложения</h3>
                                                </div>
                                                <p className="text-[11px] text-[#cbd3d9] font-mono">{ticket.attachments}</p>
                                            </div>
                                        )}

                                        {/* Original Message */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 px-2 text-[#5b6f7c]">
                                                <MessageSquare size={14} />
                                                <h3 className="text-[10px] font-bold uppercase tracking-widest">Исходное сообщение</h3>
                                            </div>
                                            <div className="bg-[#182833]/30 border border-[#233642] p-6 rounded-xl min-h-[100px]">
                                                <p className="text-[13px] text-[#cbd3d9] leading-relaxed italic">
                                                    &quot;{ticket?.description || 'Описание отсутствует'}&quot;
                                                </p>
                                            </div>
                                        </div>

                                        {/* Assignment History */}
                                        {ticket?.assignmentLogs?.length > 1 && (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 px-2 text-[#5b6f7c]">
                                                    <Clock size={14} />
                                                    <h3 className="text-[10px] font-bold uppercase tracking-widest">История назначений</h3>
                                                </div>
                                                <div className="space-y-2">
                                                    {ticket.assignmentLogs.map((log: any, i: number) => (
                                                        <div key={log.id} className="flex items-center gap-3 text-[11px] text-[#cbd3d9] bg-[#182833]/20 p-3 rounded-lg border border-[#233642]/50">
                                                            <span className="text-[#5b6f7c] font-mono text-[10px] shrink-0">
                                                                {new Date(log.createdAt).toLocaleString('ru-RU')}
                                                            </span>
                                                            <ArrowRight size={12} className="text-[#5b6f7c] shrink-0" />
                                                            <span className="font-medium">{log.toManager?.fullName || '—'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

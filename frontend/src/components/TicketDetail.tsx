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
    Zap,
    Cpu,
    Globe,
    Layers,
    UserCheck,
    BarChart3,
    Terminal,
    Navigation2,
} from 'lucide-react';
import { ticketService } from '@/services/api';

interface TicketDetailProps {
    ticketId: string | null;
    onClose: () => void;
}

export function TicketDetail({ ticketId, onClose }: TicketDetailProps) {
    const [view, setView] = useState<'visual' | 'audit'>('visual');
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
            setView('visual');
        }
    }, [ticketId]);

    if (!ticketId) return null;

    const assignmentLog = ticket?.assignmentLogs?.[0];
    const rawReason = assignmentLog?.reason || "";
    const reasonParts = rawReason.split(' | ').filter(Boolean);
    const trace = ticket?.analysis?.trace;

    // Helper to get step-specific icon
    const getStepIcon = (text: string) => {
        const lower = text.toLowerCase();
        if (lower.includes('гео')) return <Globe size={14} />;
        if (lower.includes('эскалация') || lower.includes('должность')) return <ShieldAlert size={14} />;
        if (lower.includes('навыки')) return <Layers size={14} />;
        if (lower.includes('round robin')) return <BarChart3 size={14} />;
        return <CheckCircle2 size={14} />;
    };

    const AuditLog = ({ step }: { step: any }) => (
        <div className="bg-[#0d161d] border border-[#233642] rounded-2xl overflow-hidden mb-10 shadow-2xl">
            {/* Step Header */}
            <div className="bg-[#182833] px-6 py-4 flex justify-between items-center border-b border-[#233642]">
                <div className="flex flex-col">
                    <span className="text-primary font-black text-xs uppercase tracking-[0.2em]">{step.name}</span>
                    <span className="text-[10px] text-[#5b6f7c] font-bold mt-1">{step.description}</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="h-1 w-12 bg-[#233642] rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1 }}
                            className="h-full bg-primary"
                        />
                    </div>
                    <span className="text-emerald-400 font-mono text-xs font-bold">{step.duration}ms</span>
                </div>
            </div>

            <div className="p-8 space-y-8">
                {/* 1. Request Context */}
                {step.payload && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Terminal size={14} className="text-amber-500" />
                            <span className="text-[10px] font-black text-[#5b6f7c] uppercase tracking-widest">Input Payload / Context</span>
                        </div>
                        <div className="bg-black/40 rounded-xl p-4 border border-[#233642] group relative">
                            <pre className="text-[11px] text-[#cbd3d9] font-mono whitespace-pre-wrap leading-relaxed">
                                {JSON.stringify(step.payload, null, 2)}
                            </pre>
                            <div className="absolute top-2 right-2 opacity-20 group-hover:opacity-100 transition-opacity">
                                <Cpu size={12} className="text-[#5b6f7c]" />
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Logic & Derivation */}
                {step.logic && (
                    <div className="grid grid-cols-2 gap-4">
                        {Object.entries(step.logic).map(([key, val]: [string, any]) => (
                            <div key={key} className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                                <span className="block text-[8px] text-primary font-black uppercase mb-1">{key.replace(/_/g, ' ')}</span>
                                <span className="text-[11px] text-[#cbd3d9] font-bold">{val}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. Specialized Renderers */}

                {/* Geocoding Cascade Table */}
                {step.attempts && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Globe size={14} className="text-blue-500" />
                            <span className="text-[10px] font-black text-[#5b6f7c] uppercase tracking-widest">Geocoding Cascade Logic</span>
                        </div>
                        <div className="overflow-hidden border border-[#233642] rounded-xl">
                            <table className="w-full text-left text-[10px] font-mono">
                                <thead className="bg-black/40 text-[#5b6f7c]">
                                    <tr>
                                        <th className="px-4 py-3 font-black">STEP</th>
                                        <th className="px-4 py-3 font-black">QUERY</th>
                                        <th className="px-4 py-3 font-black">STATUS</th>
                                        <th className="px-4 py-3 font-black">LAT/LNG</th>
                                        <th className="px-4 py-3 font-black">DELAY</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#233642]">
                                    {step.attempts?.map((att: any, i: number) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3 text-[#5b6f7c]">#{att.step}</td>
                                            <td className="px-4 py-3 text-[#cbd3d9]">{att.query}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded ${att.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                    {att.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-[#5b6f7c]">
                                                {att.result ? `${att.result.lat?.toFixed(4)}, ${att.result.lng?.toFixed(4)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-white font-bold">{att.duration}ms</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Internal Pipeline Trace */}
                {step.trace && (
                    <div className="space-y-8">
                        {step.trace?.map((t: any, i: number) => (
                            <div key={i} className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#233642]" />
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">{t.stage}</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#233642]" />
                                </div>

                                {t.analysis && (
                                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl flex gap-4 items-start">
                                        <BrainCircuit size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-emerald-400 font-medium leading-relaxed italic">{t.analysis}</p>
                                    </div>
                                )}

                                {/* Distance Table or Manager Pool */}
                                {t.distances ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {t.distances?.map((d: any, di: number) => (
                                            <div key={di} className={`p-4 rounded-xl border flex justify-between items-center ${di === 0 ? 'bg-primary/10 border-primary/30' : 'bg-black/20 border-[#233642]'}`}>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-white">{d.name}</span>
                                                    <span className="text-[9px] text-[#5b6f7c]">ID: {d.id}</span>
                                                </div>
                                                <span className={`font-mono text-xs font-black ${di === 0 ? 'text-primary' : 'text-[#5b6f7c]'}`}>{d.distance}km</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (t.candidates_before || t.pool) ? (
                                    <div className="overflow-hidden border border-[#233642] rounded-xl">
                                        <table className="w-full text-left text-[9px] font-mono">
                                            <thead className="bg-black/40 text-[#5b6f7c]">
                                                <tr>
                                                    <th className="px-4 py-2">MANAGER</th>
                                                    <th className="px-4 py-2">POSITION</th>
                                                    <th className="px-4 py-2">SKILLS</th>
                                                    <th className="px-4 py-2">LOAD</th>
                                                    <th className="px-4 py-2 text-right">STATUS</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#233642]">
                                                {(t.candidates_before || t.pool)?.map((m: any, mi: number) => {
                                                    const isAfter = (t.candidates_after || t.top_candidates || [])?.some((ca: any) => ca.id === m.id);
                                                    const isSelected = t.decision?.managerId === m.id;
                                                    return (
                                                        <tr key={mi} className={`${isSelected ? 'bg-primary/20' : isAfter ? 'bg-white/5' : 'opacity-30'}`}>
                                                            <td className="px-4 py-2">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-white">{m.name}</span>
                                                                    <span className="text-[8px] text-[#5b6f7c]">{m.id}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-[#cbd3d9]">{m.position}</td>
                                                            <td className="px-4 py-2">
                                                                <div className="flex gap-1">
                                                                    {m.skills?.map((s: string) => (
                                                                        <span key={s} className="px-1 bg-black/40 rounded border border-[#233642]">{s}</span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-white font-bold">{m.activeTickets ?? 0} 📂</td>
                                                            <td className="px-4 py-2 text-right">
                                                                {isSelected ? (
                                                                    <span className="text-primary font-black animate-pulse">SELECTED</span>
                                                                ) : isAfter ? (
                                                                    <span className="text-emerald-400">PASSED</span>
                                                                ) : (
                                                                    <span className="text-red-500/50">FILTERED</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}

                                {t.note && (
                                    <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                            <ShieldAlert size={10} /> {t.note}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* 4. Result/Response Block */}
                {step.response && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black text-[#5b6f7c] uppercase tracking-widest">Inference Response / Decision Output</span>
                        </div>
                        <div className="bg-[#182833] rounded-xl p-6 border border-[#233642] relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                            <pre className="text-[11px] text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed relative z-10">
                                {JSON.stringify(step.response, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

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
                    className="relative w-full max-w-5xl bg-[#0f171c] h-full shadow-2xl flex flex-col border-l border-[#233642]"
                >
                    {/* Header */}
                    <div className="h-16 bg-[#182833] border-b border-[#233642] flex items-center px-8 justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Terminal size={18} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2">
                                    Diagnostic Trace
                                    <span className="text-[#5b6f7c] font-mono text-xs font-normal ml-2">#{ticketId.slice(-8).toUpperCase()}</span>
                                </h2>
                                <p className="text-[10px] text-[#5b6f7c] font-bold uppercase tracking-tighter">Системный аудит обработки обращения</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex bg-black/30 rounded-full p-1 border border-[#233642] mr-4">
                                <button
                                    onClick={() => setView('visual')}
                                    className={`px-4 py-1 rounded-full text-[10px] font-black uppercase transition-all ${view === 'visual' ? 'bg-primary text-black' : 'text-[#5b6f7c]'}`}
                                >
                                    Visual
                                </button>
                                <button
                                    onClick={() => setView('audit')}
                                    className={`px-4 py-1 rounded-full text-[10px] font-black uppercase transition-all ${view === 'audit' ? 'bg-amber-500 text-black' : 'text-[#5b6f7c]'}`}
                                >
                                    Auditor
                                </button>
                            </div>
                            <button onClick={onClose} className="text-[#5b6f7c] hover:text-white transition-all hover:rotate-90 bg-[#0d161d] p-2 rounded-xl border border-[#233642]">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex">
                        {/* LEFT: Metadata Sidebar */}
                        <div className="w-80 border-r border-[#233642] bg-[#0d161d] overflow-y-auto p-8 space-y-10 flex-shrink-0 custom-scrollbar">

                            {/* Assignee / Responsible */}
                            <section>
                                <div className="flex items-center gap-2 mb-6">
                                    <UserCheck size={14} className="text-primary" />
                                    <h4 className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-[0.2em]">Decision Target</h4>
                                </div>
                                <div className="bg-[#182833]/50 p-5 rounded-2xl border border-[#233642] space-y-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black text-lg border border-primary/30 shadow-lg shadow-primary/5">
                                            {ticket?.manager?.fullName?.[0] || '?'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-white">{ticket?.manager?.fullName || 'NOT ASSIGNED'}</span>
                                            <span className="text-[9px] text-primary uppercase font-black tracking-widest mt-1">
                                                {ticket?.manager?.position?.replace(/_/g, ' ') || 'Manager'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-[#233642] flex items-center gap-3">
                                        <Building2 size={16} className="text-[#5b6f7c]" />
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-[#cbd3d9]">{ticket?.office?.name || 'В очереди'}</span>
                                            <span className="text-[9px] text-[#5b6f7c] uppercase font-bold tracking-tight italic">Офис обслуживания</span>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Geocoding Diagnostics */}
                            <section>
                                <div className="flex items-center gap-2 mb-6">
                                    <Navigation2 size={14} className="text-amber-500" />
                                    <h4 className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-[0.2em]">Гео-аналитика</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-[#182833]/50 p-4 rounded-xl border border-[#233642]">
                                        <p className="text-[10px] text-[#5b6f7c] font-black uppercase mb-3">Координаты</p>
                                        {ticket?.analysis?.latitude ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-black/40 p-2 rounded-lg border border-[#233642]">
                                                    <span className="block text-[8px] text-[#5b6f7c] font-bold uppercase mb-1">ШИРОТА</span>
                                                    <span className="text-[11px] text-white font-mono">{ticket.analysis.latitude.toFixed(6)}</span>
                                                </div>
                                                <div className="bg-black/40 p-2 rounded-lg border border-[#233642]">
                                                    <span className="block text-[8px] text-[#5b6f7c] font-bold uppercase mb-1">ДОЛГОТА</span>
                                                    <span className="text-[11px] text-white font-mono">{ticket.analysis.longitude.toFixed(6)}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-[#5b6f7c] italic">Координаты не определены</p>
                                        )}
                                    </div>
                                    <div className="flex items-start gap-3 p-2">
                                        <MapPin size={16} className="text-[#5b6f7c] shrink-0 mt-0.5" />
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[10px] text-[#cbd3d9] leading-tight font-bold">
                                                {ticket?.country}, {ticket?.oblast}, {ticket?.city}
                                            </p>
                                            <p className="text-[9px] text-[#5b6f7c] italic">
                                                {ticket?.street} {ticket?.houseNumber}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Core Performance Metrics */}
                            <section>
                                <div className="flex items-center gap-2 mb-6">
                                    <Cpu size={14} className="text-emerald-500" />
                                    <h4 className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-[0.2em]">Производительность</h4>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { label: 'AI Анализ', val: ticket?.analysis?.aiDuration, color: 'bg-primary' },
                                        { label: 'Гео-синтез', val: ticket?.analysis?.geoDuration, color: 'bg-amber-500' },
                                        { label: 'Маршрутизация', val: ticket?.analysis?.routingDuration, color: 'bg-emerald-500' },
                                    ].map(stat => (
                                        <div key={stat.label}>
                                            <div className="flex justify-between text-[9px] font-black uppercase mb-1.5">
                                                <span className="text-[#5b6f7c]">{stat.label}</span>
                                                <span className="text-white font-mono">{stat.val || 0}мс</span>
                                            </div>
                                            <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, (stat.val / (ticket?.analysis?.totalDuration || 1)) * 100)}%` }}
                                                    className={`h-full ${stat.color}`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-4 mt-2 border-t border-[#233642] flex justify-between items-center">
                                        <span className="text-[10px] text-white font-black uppercase tracking-widest">Общее время (E2E)</span>
                                        <div className="bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                            <span className="text-xs font-black text-emerald-400 font-mono">{ticket?.analysis?.totalDuration || 0}мс</span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* RIGHT CONTENT */}
                        <div className="flex-1 bg-[#0f171c] overflow-y-auto custom-scrollbar flex flex-col">
                            {view === 'visual' ? (
                                <div className="p-10 space-y-12">
                                    {/* Intelligence Discovery Row */}
                                    <div className="grid grid-cols-12 gap-8">
                                        <div className="col-span-12 lg:col-span-7 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-[#182833] rounded-xl border border-[#233642]">
                                                    <MessageSquare size={16} className="text-[#5b6f7c]" />
                                                </div>
                                                <h3 className="text-xs font-black text-[#5b6f7c] uppercase tracking-[0.2em]">Содержание обращения</h3>
                                            </div>
                                            <div className="bg-[#182833]/30 border border-[#233642] p-8 rounded-3xl relative">
                                                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl pointer-events-none text-white select-none">"</div>
                                                <p className="text-sm text-[#cbd3d9] leading-[1.8] font-medium italic relative z-10 antialiased">
                                                    {ticket?.description || 'Текст обращения не предоставлен.'}
                                                </p>
                                            </div>
                                            {ticket?.attachments && (
                                                <div className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                                                    <ShieldAlert size={18} className="text-amber-500 shrink-0" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Цифровое вложение</span>
                                                        <span className="text-[11px] text-[#cbd3d9] font-mono truncate max-w-md">{ticket.attachments}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-span-12 lg:col-span-5 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                                                    <BrainCircuit size={16} className="text-primary" />
                                                </div>
                                                <h3 className="text-xs font-black text-[#5b6f7c] uppercase tracking-[0.2em]">AI Предикты</h3>
                                            </div>
                                            <div className="bg-[#182833] border border-primary/20 p-8 rounded-3xl relative overflow-hidden shadow-2xl shadow-primary/5">
                                                <div className="absolute -right-8 -bottom-8 text-primary/5">
                                                    <BrainCircuit size={160} strokeWidth={0.5} />
                                                </div>
                                                <div className="relative z-10 space-y-6">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-end border-b border-[#233642] pb-3">
                                                            <span className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-wider">Категория</span>
                                                            <span className="text-xs font-black text-white uppercase">{String(ticket?.analysis?.type || '—').replace(/_/g, ' ')}</span>
                                                        </div>
                                                        <div className="flex justify-between items-end border-b border-[#233642] pb-3">
                                                            <span className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-wider">Тональность</span>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${(ticket?.analysis?.sentiment === 'Негативный' || ticket?.analysis?.sentiment === 'NEGATIVE') ? 'bg-red-500/10 text-red-500' :
                                                                (ticket?.analysis?.sentiment === 'Позитивный' || ticket?.analysis?.sentiment === 'POSITIVE') ? 'bg-emerald-500/10 text-emerald-500' :
                                                                    'bg-blue-500/10 text-blue-500'
                                                                }`}>
                                                                {(ticket?.analysis?.sentiment === 'Негативный' || ticket?.analysis?.sentiment === 'NEGATIVE') ? 'НЕГАТИВНЫЙ' :
                                                                    (ticket?.analysis?.sentiment === 'Позитивный' || ticket?.analysis?.sentiment === 'POSITIVE') ? 'ПОЗИТИВНЫЙ' : 'НЕЙТРАЛЬНЫЙ'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-end border-b border-[#233642] pb-3">
                                                            <span className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-wider">Язык</span>
                                                            <span className="text-xs font-black text-white">{ticket?.analysis?.language || 'RU'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="pt-2">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-wider">Приоритет</span>
                                                            <span className={`text-xl font-black ${(ticket?.analysis?.priority ?? 0) >= 8 ? 'text-red-500' : (ticket?.analysis?.priority ?? 0) >= 6 ? 'text-amber-500' : 'text-primary'}`}>
                                                                P{ticket?.analysis?.priority || 1}
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${(ticket?.analysis?.priority || 1) * 10}%` }}
                                                                className={`h-full ${(ticket?.analysis?.priority ?? 0) >= 8 ? 'bg-red-500' : (ticket?.analysis?.priority ?? 0) >= 6 ? 'bg-amber-500' : 'bg-primary'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Decision Timeline */}
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                                                <Route size={16} className="text-primary" />
                                            </div>
                                            <h3 className="text-xs font-black text-[#5b6f7c] uppercase tracking-[0.2em]">Хронология решений</h3>
                                        </div>

                                        <div className="relative pl-8 space-y-10">
                                            <div className="absolute left-3 top-2 bottom-2 w-[1px] bg-gradient-to-b from-primary via-[#233642] to-[#233642]" />

                                            <div className="relative group">
                                                <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-[#182833] border-2 border-primary flex items-center justify-center">
                                                    <Zap size={8} className="text-primary" />
                                                </div>
                                                <div className="bg-[#182833]/20 border border-[#233642] p-6 rounded-2xl">
                                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Шаг 01: Идентификация</h4>
                                                    <p className="text-sm font-bold text-[#cbd3d9]">
                                                        {ticket?.analysis?.summary || 'Анализ контента и извлечение контекста...'}
                                                    </p>
                                                </div>
                                            </div>

                                            {reasonParts.map((part: string, idx: number) => (
                                                <div key={idx} className="relative group">
                                                    <div className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-[#182833] border-2 flex items-center justify-center ${idx === reasonParts.length - 1 ? 'border-emerald-500' : 'border-[#3489db]'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${idx === reasonParts.length - 1 ? 'bg-emerald-500' : 'bg-[#3489db]'}`} />
                                                    </div>
                                                    <div className="bg-[#182833]/20 border border-[#233642] p-6 rounded-2xl">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="p-1 rounded bg-black/40 text-[10px]">
                                                                {getStepIcon(part)}
                                                            </span>
                                                            <h4 className={`text-[10px] font-black uppercase tracking-widest ${idx === reasonParts.length - 1 ? 'text-emerald-400' : 'text-[#3489db]'}`}>
                                                                Шаг {String(idx + 2).padStart(2, '0')}: {part.split(':')[0]}
                                                            </h4>
                                                        </div>
                                                        <p className="text-sm font-medium text-[#cbd3d9] leading-relaxed">
                                                            {part.includes(':') ? part.split(':').slice(1).join(':').trim().replace(/_/g, ' ') : part.replace(/_/g, ' ')}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-10 space-y-8 animate-in fade-in duration-500">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                                <ShieldAlert size={16} className="text-amber-500" />
                                            </div>
                                            <h3 className="text-xs font-black text-[#5b6f7c] uppercase tracking-[0.2em]">Режим аудитора</h3>
                                        </div>
                                        <span className="text-[9px] font-mono text-amber-500/50 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 uppercase">
                                            TRACING ACTIVE
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {trace?.steps ? (
                                            trace.steps.map((step: any, i: number) => (
                                                <AuditLog key={i} step={step} />
                                            ))
                                        ) : (
                                            <div className="p-10 text-center border-2 border-dashed border-[#233642] rounded-3xl">
                                                <Terminal className="mx-auto text-[#5b6f7c] mb-4 opacity-20" size={40} />
                                                <p className="text-[#5b6f7c] font-mono text-xs">Нет данных трассировки для этого обращения.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="p-10 pt-0 mt-auto">
                                <div className="pt-8 border-t border-[#233642] flex flex-wrap gap-8 justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-[#5b6f7c] font-black uppercase mb-1">Дата поступления</span>
                                            <span className="text-[11px] text-[#cbd3d9] font-mono">{ticket?.createdAt ? new Date(ticket.createdAt).toLocaleString('ru-RU') : '—'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-[#5b6f7c] font-black uppercase mb-1">Сегмент</span>
                                            <span className={`text-[11px] font-black ${ticket?.segment === 'VIP' ? 'text-amber-500' : 'text-primary'}`}>
                                                {ticket?.segment === 'VIP' ? 'VIP' : ticket?.segment === 'PRIORITY' ? 'Приоритетный' : 'Массовый'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[#5b6f7c]">
                                        <Layers size={14} />
                                        <span className="text-[9px] font-bold uppercase tracking-wider italic">FIRE Trace</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

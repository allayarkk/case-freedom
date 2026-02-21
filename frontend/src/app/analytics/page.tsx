"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { analyticsService } from '@/services/api';
import { TicketDetail } from '@/components/TicketDetail';
import {
    History as HistoryIcon,
    Zap,
    Clock,
    ChevronRight,
    TrendingDown,
    BarChart3,
    Search,
    CheckCircle2,
    Calendar,
    Layers,
    Activity,
    ArrowRight,
    BrainCircuit,
    MapPin,
    Route,
    Loader2,
} from 'lucide-react';

interface ImportSession {
    id: string;
    name: string;
    totalTickets: number;
    status: string;
    createdAt: string;
    _count?: { tickets: number };
}

interface SessionDetail extends ImportSession {
    tickets: any[];
    stats: {
        avgAi: number;
        avgGeo: number;
        avgRouting: number;
        avgTotal: number;
    };
}

export default function AnalyticsPage() {
    const [history, setHistory] = useState<ImportSession[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const res = await analyticsService.getImportHistory();
            setHistory(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectSession = async (id: string) => {
        setSelectedSessionId(id);
        setDetailLoading(true);
        try {
            const res = await analyticsService.getImportSessionDetail(id);
            setSessionDetail(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setDetailLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Activity className="text-primary" />
                        Performance & History
                    </h2>
                    <p className="text-[#5b6f7c]">Аналитика импорта и время отклика AI-ядра системы.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-[#182833] border border-[#233642] px-6 py-3 rounded-2xl flex items-center gap-3">
                        <BarChart3 className="text-emerald-400" size={20} />
                        <div>
                            <p className="text-[10px] text-[#5b6f7c] font-black uppercase tracking-widest">Total Imports</p>
                            <p className="text-xl font-black text-white">{history.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: History List */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xs font-black text-[#5b6f7c] uppercase tracking-[0.2em] flex items-center gap-2">
                            <HistoryIcon size={14} />
                            Recent Imports
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            [1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />)
                        ) : (
                            history.map(session => (
                                <button
                                    key={session.id}
                                    onClick={() => handleSelectSession(session.id)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group ${selectedSessionId === session.id
                                        ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5'
                                        : 'bg-[#182833]/50 border-[#233642] hover:border-[#384c5a]'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1 relative z-10">
                                        <span className="text-[11px] font-bold text-white truncate max-w-[180px]">
                                            {session.name}
                                        </span>
                                        <span className="text-[9px] font-black text-[#5b6f7c] font-mono">
                                            {new Date(session.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="flex items-center gap-1.5">
                                            <Layers size={12} className="text-[#5b6f7c]" />
                                            <span className="text-[10px] font-bold text-[#5b6f7c]">
                                                {session.totalTickets} tickets
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${session.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            <span className="text-[9px] font-black text-[#5b6f7c] uppercase">{session.status}</span>
                                        </div>
                                    </div>
                                    {selectedSessionId === session.id && (
                                        <motion.div
                                            layoutId="active-indicator"
                                            className="absolute left-0 top-0 bottom-0 w-1 bg-primary"
                                        />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Detailed View */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {!selectedSessionId ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full min-h-[500px] border border-dashed border-[#233642] rounded-3xl flex flex-col items-center justify-center text-[#5b6f7c] space-y-4"
                            >
                                <div className="w-16 h-16 rounded-full bg-[#182833] flex items-center justify-center">
                                    <TrendingDown size={32} />
                                </div>
                                <p className="text-sm font-medium">Выберите сессию импорта для просмотра аналитики</p>
                            </motion.div>
                        ) : detailLoading ? (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full min-h-[500px] flex items-center justify-center"
                            >
                                <Loader2 className="animate-spin text-primary" size={40} />
                            </motion.div>
                        ) : sessionDetail && (
                            <motion.div
                                key="detail"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Avg AI', val: sessionDetail.stats.avgAi, icon: <BrainCircuit size={16} />, color: 'text-primary' },
                                        { label: 'Avg Geo', val: sessionDetail.stats.avgGeo, icon: <MapPin size={16} />, color: 'text-amber-500' },
                                        { label: 'Avg Route', val: sessionDetail.stats.avgRouting, icon: <Route size={16} />, color: 'text-emerald-500' },
                                        { label: 'Avg Total', val: sessionDetail.stats.avgTotal, icon: <Clock size={16} />, color: 'text-white' },
                                    ].map((stat, i) => (
                                        <Card key={i} className="p-4 bg-[#182833] border-[#233642]">
                                            <div className={`mb-2 ${stat.color}`}>{stat.icon}</div>
                                            <p className="text-[10px] text-[#5b6f7c] font-black uppercase mb-1">{stat.label}</p>
                                            <p className="text-xl font-bold font-mono text-white">{stat.val}<span className="text-xs text-[#5b6f7c] ml-1">ms</span></p>
                                        </Card>
                                    ))}
                                </div>

                                {/* Tickets Table */}
                                <Card className="bg-[#182833]/30 border-[#233642] overflow-hidden">
                                    <div className="px-6 py-4 border-b border-[#233642] flex justify-between items-center bg-[#182833]/50">
                                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Ticket Logs</h4>
                                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase">
                                            {sessionDetail.tickets.length} processed
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[#111b21]">
                                                    <th className="px-6 py-3 text-[10px] font-black text-[#5b6f7c] uppercase tracking-widest">Description</th>
                                                    <th className="px-6 py-3 text-[10px] font-black text-[#5b6f7c] uppercase tracking-widest text-center">AI</th>
                                                    <th className="px-6 py-3 text-[10px] font-black text-[#5b6f7c] uppercase tracking-widest text-center">GEO</th>
                                                    <th className="px-6 py-3 text-[10px] font-black text-[#5b6f7c] uppercase tracking-widest text-center">Total</th>
                                                    <th className="px-6 py-3 text-[10px] font-black text-[#5b6f7c] uppercase tracking-widest">Manager</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#233642]/30">
                                                {sessionDetail.tickets.map(ticket => (
                                                    <tr
                                                        key={ticket.id}
                                                        onClick={() => setSelectedTicketId(ticket.id)}
                                                        className="hover:bg-primary/5 cursor-pointer transition-colors group"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <p className="text-[11px] font-bold text-[#cbd3d9] truncate max-w-[200px]">{ticket.description}</p>
                                                            <p className="text-[9px] text-[#5b6f7c] uppercase font-bold">{ticket.city}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-mono text-[10px] text-[#5b6f7c] group-hover:text-primary">
                                                            {ticket.analysis?.aiDuration}ms
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-mono text-[10px] text-[#5b6f7c] group-hover:text-amber-500">
                                                            {ticket.analysis?.geoDuration}ms
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-mono text-[11px] font-bold text-white">
                                                            {ticket.analysis?.totalDuration}ms
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center text-[10px] text-emerald-400 font-black border border-emerald-500/20">
                                                                    {ticket.manager?.fullName?.[0] || '?'}
                                                                </div>
                                                                <span className="text-[11px] font-bold text-[#cbd3d9]">{ticket.manager?.fullName || '—'}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <TicketDetail ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
        </div>
    );
}

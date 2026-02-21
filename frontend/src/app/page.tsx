"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { ticketService, analyticsService } from '@/services/api';
import {
    Upload,
    LayoutGrid,
    BarChart3,
    BrainCircuit,
    MapPin,
    ArrowRight,
    Star,
    AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

type ViewMode = 'priority' | 'category';

interface Ticket {
    id: string;
    description: string;
    segment: string;
    city: string;
    manager?: { fullName: string };
    analysis?: {
        type: string;
        sentiment: string;
        priority: number;
        language: string;
        summary: string;
    };
}

const CATEGORY_COLUMNS = [
    { key: 'COMPLAINT', label: 'Жалоба', color: 'bg-red-500', glow: 'shadow-red-500/20' },
    { key: 'DATA_CHANGE', label: 'Смена данных', color: 'bg-blue-500', glow: 'shadow-blue-500/20' },
    { key: 'CONSULTATION', label: 'Консультация', color: 'bg-emerald-500', glow: 'shadow-emerald-500/20' },
    { key: 'CLAIM', label: 'Претензия', color: 'bg-orange-500', glow: 'shadow-orange-500/20' },
    { key: 'APP_MALFUNCTION', label: 'Проблемы приложения', color: 'bg-purple-500', glow: 'shadow-purple-500/20' },
];

const PRIORITY_LABELS: Record<number, string> = {
    0: 'Не разобрано',
    10: 'Критический',
    9: 'Очень высокий',
    8: 'Высокий',
    7: 'Выше среднего',
    6: 'Средний+',
    5: 'Средний',
    4: 'Ниже среднего',
    3: 'Низкий',
    2: 'Очень низкий',
    1: 'Минимальный',
};

const PRIORITY_COLORS: Record<number, string> = {
    0: 'bg-slate-500',
    10: 'bg-red-600',
    9: 'bg-red-500',
    8: 'bg-orange-500',
    7: 'bg-amber-500',
    6: 'bg-yellow-500',
    5: 'bg-lime-500',
    4: 'bg-green-500',
    3: 'bg-teal-500',
    2: 'bg-cyan-500',
    1: 'bg-sky-500',
};

function PriorityBadge({ priority }: { priority: number }) {
    const bg = PRIORITY_COLORS[priority] ?? 'bg-slate-500';
    return (
        <span className={`${bg} text-white text-[9px] font-bold px-1.5 py-0.5 rounded`}>
            P{priority}
        </span>
    );
}

function TicketCard({ ticket }: { ticket: Ticket }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            layout
        >
            <Card className="p-3 flex flex-col gap-2 cursor-pointer hover:border-primary/30 group border-white/5">
                <div className="flex justify-between items-start gap-1">
                    <span className="font-mono text-[9px] text-slate-500 truncate">
                        #{ticket.id.slice(-6).toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                        {ticket.segment === 'VIP' && <Star size={10} className="text-yellow-400 fill-yellow-400" />}
                        {ticket.analysis && <PriorityBadge priority={ticket.analysis.priority} />}
                    </div>
                </div>

                <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                    {ticket.description}
                </p>

                {ticket.analysis && (
                    <div className="flex items-center gap-1">
                        <BrainCircuit size={10} className="text-primary shrink-0" />
                        <span className="text-[9px] text-slate-500 truncate">{ticket.analysis.summary}</span>
                    </div>
                )}

                <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                    <div className="flex items-center gap-1.5">
                        {ticket.manager ? (
                            <>
                                <div className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center text-[8px] font-bold">
                                    {ticket.manager.fullName[0]}
                                </div>
                                <span className="text-[9px] text-slate-400 truncate max-w-[80px]">
                                    {ticket.manager.fullName}
                                </span>
                            </>
                        ) : (
                            <span className="text-[9px] text-slate-600">Не назначен</span>
                        )}
                    </div>
                    <ArrowRight size={12} className="text-slate-700 group-hover:text-primary transition-colors shrink-0" />
                </div>
            </Card>
        </motion.div>
    );
}

function EmptyState() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Upload size={40} className="text-primary opacity-60" />
            </div>
            <div>
                <h3 className="text-2xl font-bold mb-2">База данных пуста</h3>
                <p className="text-slate-500 max-w-sm">
                    Загрузите CSV-файл с обращениями, чтобы движок FIRE начал анализ и распределение.
                </p>
            </div>
            <Link
                href="/import"
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-primary/20"
            >
                <Upload size={18} />
                Upload CSV first
            </Link>
        </div>
    );
}

export default function Dashboard() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [totalTickets, setTotalTickets] = useState(0);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('priority');

    useEffect(() => {
        async function load() {
            try {
                const { data } = await ticketService.getTickets({ limit: 200, page: 1 } as any);
                const list: Ticket[] = data.data ?? [];
                setTickets(list);
                setTotalTickets(data.meta?.total ?? list.length);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const isEmpty = !loading && tickets.length === 0;
    const autoRouted = tickets.filter(t => t.manager).length;
    const autoPercent = totalTickets > 0 ? Math.round((autoRouted / totalTickets) * 100) : 0;

    return (
        <div className="flex flex-col h-screen overflow-hidden p-6 gap-6">
            {/* Header */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-slate-500 text-sm">Intelligent Routing Status</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Stats */}
                    {!isEmpty && (
                        <>
                            <Card className="px-5 py-2 flex flex-col items-center border-white/5">
                                <span className="text-xl font-bold">{totalTickets}</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total</span>
                            </Card>
                            <Card className="px-5 py-2 flex flex-col items-center border-primary/30">
                                <span className="text-xl font-bold text-primary">{autoPercent}%</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Auto Routed</span>
                            </Card>
                        </>
                    )}

                    {/* View toggle */}
                    <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setViewMode('priority')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'priority' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <BarChart3 size={14} />
                            По приоритету
                        </button>
                        <button
                            onClick={() => setViewMode('category')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'category' ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <LayoutGrid size={14} />
                            По категориям
                        </button>
                    </div>
                </div>
            </div>

            {/* Body */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : isEmpty ? (
                <EmptyState />
            ) : (
                <AnimatePresence mode="wait">
                    {viewMode === 'priority' ? (
                        <PriorityBoard key="priority" tickets={tickets} />
                    ) : (
                        <CategoryBoard key="category" tickets={tickets} />
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}

/* ── Priority Board (AmoCRM-style) ────────────────────────────── */
function PriorityBoard({ tickets }: { tickets: Ticket[] }) {
    // Group: priority=0 means "no analysis" (unprocessed)
    const columns = [0, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

    const byPriority: Record<number, Ticket[]> = {};
    for (const col of columns) byPriority[col] = [];

    for (const t of tickets) {
        const p = t.analysis?.priority ?? 0;
        if (byPriority[p] !== undefined) {
            byPriority[p].push(t);
        } else {
            byPriority[0].push(t);
        }
    }

    return (
        <motion.div
            key="priority"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-4 overflow-x-auto flex-1 pb-2"
            style={{ scrollbarWidth: 'thin' }}
        >
            {columns.map(priority => {
                const col = byPriority[priority];
                const dotColor = PRIORITY_COLORS[priority];
                return (
                    <div
                        key={priority}
                        className="flex flex-col shrink-0 w-56 gap-3"
                    >
                        {/* Column header */}
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">
                                    {priority === 0 ? 'Не разобрано' : `P${priority}`}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                                {col.length}
                            </span>
                        </div>

                        {/* Sub-label */}
                        <p className="text-[9px] text-slate-600 px-1 -mt-2 whitespace-nowrap">
                            {priority === 0 ? 'Без AI-анализа' : PRIORITY_LABELS[priority]}
                        </p>

                        {/* Ticket cards */}
                        <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: 'none' }}>
                            {col.length === 0 ? (
                                <div className="border border-dashed border-white/5 rounded-xl h-16 flex items-center justify-center">
                                    <span className="text-[10px] text-slate-700">Пусто</span>
                                </div>
                            ) : (
                                col.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
                            )}
                        </div>
                    </div>
                );
            })}
        </motion.div>
    );
}

/* ── Category Board ─────────────────────────────────────────────── */
function CategoryBoard({ tickets }: { tickets: Ticket[] }) {
    const byCategory: Record<string, Ticket[]> = {};
    for (const col of CATEGORY_COLUMNS) byCategory[col.key] = [];
    byCategory['OTHER'] = [];

    for (const t of tickets) {
        const type = t.analysis?.type;
        if (type && byCategory[type] !== undefined) {
            byCategory[type].push(t);
        } else {
            byCategory['OTHER'].push(t);
        }
    }

    const allCols = [
        ...CATEGORY_COLUMNS,
        { key: 'OTHER', label: 'Прочее', color: 'bg-slate-500', glow: '' },
    ];

    return (
        <motion.div
            key="category"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-4 overflow-x-auto flex-1 pb-2"
            style={{ scrollbarWidth: 'thin' }}
        >
            {allCols.map(col => {
                const list = byCategory[col.key];
                return (
                    <div key={col.key} className="flex flex-col shrink-0 w-56 gap-3">
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                                    {col.label}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">
                                {list.length}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: 'none' }}>
                            {list.length === 0 ? (
                                <div className="border border-dashed border-white/5 rounded-xl h-16 flex items-center justify-center">
                                    <span className="text-[10px] text-slate-700">Пусто</span>
                                </div>
                            ) : (
                                list.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
                            )}
                        </div>
                    </div>
                );
            })}
        </motion.div>
    );
}

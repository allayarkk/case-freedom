"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ticketService } from '@/services/api';
import {
    Search,
    MoreHorizontal,
    Plus,
    ArrowRight,
    Filter,
    BarChart3,
    Calendar,
    ChevronDown
} from 'lucide-react';

interface Ticket {
    id: string;
    description: string;
    segment: string;
    city: string;
    createdAt: string;
    manager?: { fullName: string };
    analysis?: {
        type: string;
        priority: number;
        summary: string;
    };
}

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
    0: { label: 'НЕ РАЗОБРАНО', color: 'bg-slate-500' },
    10: { label: 'КРИТИЧЕСКИЙ', color: 'bg-red-500' },
    9: { label: 'ОЧЕНЬ ВЫСОКИЙ', color: 'bg-red-400' },
    8: { label: 'ВЫСОКИЙ', color: 'bg-orange-500' },
    7: { label: 'ВЫШЕ СРЕДНЕГО', color: 'bg-amber-500' },
    6: { label: 'СРЕДНИЙ+', color: 'bg-yellow-500' },
    5: { label: 'СРЕДНИЙ', color: 'bg-lime-500' },
    4: { label: 'НИЖЕ СРЕДНЕГО', color: 'bg-green-500' },
    3: { label: 'НИЗКИЙ', color: 'bg-teal-500' },
    2: { label: 'ОЧЕНЬ НИЗКИЙ', color: 'bg-cyan-500' },
    1: { label: 'МИНИМАЛЬНЫЙ', color: 'bg-sky-500' },
};

function TicketCard({ ticket }: { ticket: Ticket }) {
    const dateStr = new Date(ticket.createdAt).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#182833] border border-[#233642] p-2.5 rounded shadow-sm hover:bg-[#1c2e3b] transition-colors cursor-pointer group mb-2"
        >
            <div className="flex justify-between items-start mb-1 text-[10px]">
                <div className="flex flex-col">
                    <span className="text-foreground/60 font-medium">
                        {ticket.manager?.fullName || 'Без менеджера'}
                    </span>
                    <LinkProps id={ticket.id} />
                </div>
                <span className="text-[#5b6f7c]">{dateStr}</span>
            </div>

            <p className="text-[11px] text-[#cbd3d9] line-clamp-2 leading-[1.3] mb-2 font-medium">
                {ticket.description}
            </p>

            <div className="flex items-center justify-between text-[10px]">
                <div className="flex gap-1.5 items-center">
                    {ticket.segment === 'VIP' && (
                        <span className="bg-[#26c6da]/20 text-[#26c6da] px-1 rounded-[2px] font-bold text-[9px]">SAT</span>
                    )}
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                </div>
                {ticket.analysis && (
                    <span className="text-[#5b6f7c] font-mono">P{ticket.analysis.priority}</span>
                )}
            </div>
        </motion.div>
    );
}

const LinkProps = ({ id }: { id: string }) => (
    <span className="text-[#3489db] group-hover:underline text-[11px] font-bold mt-0.5">
        Обращение #{id.slice(-6).toUpperCase()}
    </span>
);

export default function Dashboard() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const { data } = await ticketService.getTickets({ limit: 200 } as any);
                setTickets(data.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const columns = [0, 8, 5, 3, 1]; // Выборка приоритетов для демонстрации

    const byPriority: Record<number, Ticket[]> = {};
    columns.forEach(c => byPriority[c] = tickets.filter(t => (t.analysis?.priority ?? 0) === c));

    return (
        <div className="flex flex-col h-screen bg-[#0d161d]">
            {/* Top Bar */}
            <div className="h-14 bg-[#111b21] border-b border-[#233642] flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-foreground font-bold text-sm uppercase tracking-wider">ВОРОНКА ОБРАЩЕНИЙ</h1>
                    <div className="h-6 w-[1px] bg-[#233642]" />
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5b6f7c]" />
                        <input
                            type="text"
                            placeholder="Поиск и фильтр"
                            className="bg-transparent text-xs pl-9 pr-4 py-1.5 rounded-md border border-transparent focus:border-[#3489db] focus:bg-[#182833] focus:outline-none w-64 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-[11px] text-[#5b6f7c]">
                        <span className="text-foreground">{tickets.length} квикета</span>
                    </div>
                    <div className="h-6 w-[1px] bg-[#233642]" />
                    <button className="text-[#5b6f7c] hover:text-white transition-colors">
                        <MoreHorizontal size={18} />
                    </button>
                    <button className="bg-[#182833] border border-[#233642] px-4 py-1.5 rounded text-[11px] font-bold hover:bg-[#1c2e3b] transition-all uppercase tracking-tight">
                        Настроить
                    </button>
                    <button className="bg-[#3489db] hover:bg-[#3b9cf7] text-white px-4 py-1.5 rounded flex items-center gap-2 text-[11px] font-extrabold shadow-lg shadow-primary/10 transition-all uppercase tracking-tight">
                        <Plus size={14} />
                        Новое обращение
                    </button>
                </div>
            </div>

            {/* Board Layout */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-0 flex">
                {columns.map((p) => {
                    const colTickets = byPriority[p] || [];
                    const config = PRIORITY_LABELS[p];

                    return (
                        <div
                            key={p}
                            className="w-[280px] shrink-0 border-r border-[#233642] flex flex-col bg-[#0d161d]/50"
                        >
                            {/* Column Header */}
                            <div className="p-4 flex flex-col items-center text-center gap-1">
                                <div className={`w-full h-1 ${config.color.replace('bg-', 'bg-')} absolute top-0`} />
                                <span className="text-[11px] font-extrabold text-[#cbd3d9] tracking-widest leading-tight">
                                    {config.label}
                                </span>
                                <span className="text-[10px] text-[#5b6f7c] uppercase font-bold">
                                    {colTickets.length} заявок
                                </span>
                            </div>

                            {/* Quick Add Button Style */}
                            {p === 0 && (
                                <div className="px-3 mb-4">
                                    <div className="border border-dashed border-[#233642] p-2.5 rounded text-[11px] text-[#5b6f7c] text-center font-bold hover:border-[#3489db] hover:text-[#3489db] cursor-pointer transition-all">
                                        Быстрое добавление
                                    </div>
                                </div>
                            )}

                            {/* Cards Container */}
                            <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
                                {colTickets.length === 0 && p !== 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-10">
                                        <div className="w-10 h-10 border border-current rounded-full mb-2" />
                                    </div>
                                ) : (
                                    colTickets.map(t => <TicketCard key={t.id} ticket={t} />)
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

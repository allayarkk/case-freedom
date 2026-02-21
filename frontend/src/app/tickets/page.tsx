"use client";

import { useEffect, useState } from 'react';
import { ticketService } from '@/services/api';
import {
    FileText,
    Search,
    Filter,
    ChevronRight,
    MapPin,
    BrainCircuit,
    MoreHorizontal,
    Plus,
    ArrowUpDown
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function TicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        async function loadTickets() {
            try {
                const { data } = await ticketService.getTickets({ limit: 500 });
                setTickets(data.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadTickets();
    }, []);

    const filteredTickets = tickets.filter(t =>
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.manager?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#0d161d] overflow-hidden">
            {/* Top Toolbar - AmoCRM Style */}
            <div className="h-14 bg-[#111b21] border-b border-[#233642] flex items-center px-4 justify-between shrink-0 z-30">
                <div className="flex items-center gap-4">
                    <h1 className="text-foreground font-bold text-sm uppercase tracking-wider">СПИСОК ОБРАЩЕНИЙ</h1>
                    <div className="h-6 w-[1px] bg-[#233642]" />
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5b6f7c]" />
                        <input
                            type="text"
                            placeholder="Поиск по описанию или ID..."
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent text-xs pl-9 pr-4 py-1.5 rounded-md border border-transparent focus:border-[#3489db] focus:bg-[#182833] focus:outline-none w-64 transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-[11px] text-[#5b6f7c] font-bold uppercase tracking-tighter">
                        {filteredTickets.length} <span className="opacity-60 font-medium">записей</span>
                    </div>
                    <div className="h-6 w-[1px] bg-[#233642]" />
                    <button className="text-[#5b6f7c] hover:text-white transition-colors p-2 flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-tight">
                        <Filter size={14} />
                        Фильтры
                    </button>
                    <button className="text-[#3489db] hover:text-[#3b9cf7] transition-colors p-2 flex items-center gap-1.5 text-[11px] uppercase font-bold tracking-tight">
                        <ArrowUpDown size={14} />
                        Сортировка
                    </button>
                    <div className="h-6 w-[1px] bg-[#233642]" />
                    <button className="bg-[#3489db] hover:bg-[#3b9cf7] text-white px-5 py-2 rounded flex items-center gap-2 text-[11px] font-black shadow-lg shadow-primary/10 transition-all uppercase tracking-tight active:scale-95">
                        <Plus size={16} strokeWidth={3} />
                        Добавить
                    </button>
                </div>
            </div>

            {/* Scrollable Table Content */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="sticky top-0 bg-[#0d161d] z-20 shadow-[0_1px_0_0_rgba(35,54,66,1)]">
                        <tr className="text-[10px] text-[#5b6f7c] uppercase font-extrabold tracking-widest">
                            <th className="px-6 py-4 border-b border-[#233642]">ID</th>
                            <th className="px-6 py-4 border-b border-[#233642]">Клиент / Описание</th>
                            <th className="px-6 py-4 border-b border-[#233642]">AI Анализ</th>
                            <th className="px-6 py-4 border-b border-[#233642]">Геопозиция</th>
                            <th className="px-6 py-4 border-b border-[#233642]">Менеджер</th>
                            <th className="px-6 py-4 border-b border-[#233642] text-right">Статус</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#233642]/50">
                        {filteredTickets.map((ticket, idx) => (
                            <motion.tr
                                key={ticket.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.01 }}
                                className="group hover:bg-[#182833]/30 transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[#3489db] font-bold text-[11px]">#{ticket.id.slice(-6).toUpperCase()}</span>
                                        <span className={`text-[9px] font-black px-1 py-0.5 rounded-[2px] w-fit italic ${ticket.segment === 'VIP' ? 'bg-amber-500/10 text-amber-500' : 'bg-[#111b21] text-[#5b6f7c]'
                                            }`}>
                                            {ticket.segment}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 max-w-md">
                                    <p className="text-[11px] font-medium text-[#cbd3d9] leading-relaxed line-clamp-2 italic opacity-90">
                                        "{ticket.description}"
                                    </p>
                                </td>
                                <td className="px-6 py-4">
                                    {ticket.analysis && (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <BrainCircuit size={12} className="text-[#3489db]" />
                                                <span className="text-[10px] font-bold text-[#cbd3d9] uppercase tracking-tighter">
                                                    {ticket.analysis.type}
                                                </span>
                                            </div>
                                            <div className="flex gap-2 text-[9px] font-bold">
                                                <span className={`${ticket.analysis.sentiment === 'NEGATIVE' ? 'text-red-400' :
                                                        ticket.analysis.sentiment === 'POSITIVE' ? 'text-green-400' : 'text-slate-500'
                                                    }`}>
                                                    {ticket.analysis.sentiment}
                                                </span>
                                                <span className="text-[#3489db]">PRIO: {ticket.analysis.priority}</span>
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-[#cbd3d9]">
                                            <MapPin size={12} className="text-[#5b6f7c]" />
                                            <span className="text-[11px] font-bold">{ticket.office?.name || 'В очереди'}</span>
                                        </div>
                                        <span className="text-[10px] text-[#5b6f7c] font-medium lowercase italic">{ticket.city}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded bg-[#111b21] border border-[#233642] flex items-center justify-center font-bold text-[10px] text-[#3489db]">
                                            {ticket.manager?.fullName?.[0] || '?'}
                                        </div>
                                        <span className="text-[11px] font-medium text-[#cbd3d9] group-hover:text-white transition-colors">
                                            {ticket.manager?.fullName || 'Не назначен'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="inline-flex w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
                {filteredTickets.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 text-[#5b6f7c]">
                        <FileText size={48} className="opacity-20 mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">Обращения не найдены</p>
                    </div>
                )}
            </div>
        </div>
    );
}

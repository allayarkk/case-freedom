"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ticketService } from '@/services/api';
import { DashboardToolbar, type GroupingMode } from '@/components/DashboardToolbar';
import { TicketCard, type Ticket } from '@/components/TicketCard';
import { TicketDetail } from '@/components/TicketDetail';

const PRIORITY_MAP: Record<number, { label: string; color: string }> = {
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

function DashboardContent() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [groupingMode, setGroupingMode] = useState<GroupingMode>('priority');
    const [searchTerm, setSearchTerm] = useState('');

    const searchParams = useSearchParams();
    const router = useRouter();
    const selectedTicketId = searchParams.get('ticketId');

    useEffect(() => {
        ticketService.getTickets({ limit: 1000 }).then(res => setTickets(res.data.data || []));
    }, []);

    const closeDetail = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('ticketId');
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const filteredTickets = useMemo(() => {
        if (!searchTerm) return tickets;
        const s = searchTerm.toLowerCase();
        return tickets.filter(t =>
            t.description.toLowerCase().includes(s) ||
            t.manager?.fullName?.toLowerCase().includes(s) ||
            t.id.toLowerCase().includes(s)
        );
    }, [tickets, searchTerm]);

    const columns = useMemo(() => {
        const cols: Array<{ key: string | number; label: string; color?: string; items: Ticket[] }> = [];

        if (groupingMode === 'priority') {
            [0, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].forEach(p => {
                cols.push({
                    key: p,
                    label: PRIORITY_MAP[p].label,
                    color: PRIORITY_MAP[p].color,
                    items: filteredTickets.filter(t => (t.analysis?.priority ?? 0) === p)
                });
            });
        } else if (groupingMode === 'office') {
            const cities = Array.from(new Set(filteredTickets.map(t => t.city || 'Неизвестно')));
            cities.forEach(city => {
                cols.push({
                    key: city,
                    label: city.toUpperCase(),
                    items: filteredTickets.filter(t => (t.city || 'Неизвестно') === city)
                });
            });
        } else if (groupingMode === 'manager') {
            const managers = Array.from(new Set(filteredTickets.map(t => t.manager?.fullName || 'Не назначено')));
            managers.forEach(m => {
                cols.push({
                    key: m,
                    label: m.toUpperCase(),
                    items: filteredTickets.filter(t => (t.manager?.fullName || 'Не назначено') === m)
                });
            });
        }
        return cols;
    }, [filteredTickets, groupingMode]);

    return (
        <>
            <div className="flex flex-col h-full overflow-hidden">
                <DashboardToolbar
                    groupingMode={groupingMode}
                    onGroupingChange={setGroupingMode}
                    onSearch={setSearchTerm}
                />

                <div className="flex-1 overflow-x-auto overflow-y-hidden flex h-full">
                    {columns.map((col) => (
                        <div key={col.key} className="w-[280px] shrink-0 border-r border-[#233642] flex flex-col bg-[#0d161d]/50">
                            <div className="p-4 flex flex-col items-center text-center gap-1 relative overflow-hidden">
                                {col.color && <div className={`w-full h-1 ${col.color} absolute top-0`} />}
                                <span className="text-[11px] font-extrabold text-[#cbd3d9] tracking-widest truncate w-full px-2">
                                    {col.label}
                                </span>
                                <span className="text-[10px] text-[#5b6f7c] uppercase font-bold">
                                    {col.items.length} заявок
                                </span>
                            </div>

                            {col.key === 0 && groupingMode === 'priority' && (
                                <div className="px-3 mb-4">
                                    <div className="border border-dashed border-[#233642] p-2.5 rounded text-[11px] text-[#5b6f7c] text-center font-bold hover:border-[#3489db] hover:text-[#3489db] cursor-pointer transition-all">
                                        Быстрое добавление
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto px-3 pb-8 custom-scrollbar">
                                {col.items.map(t => <TicketCard key={t.id} ticket={t} />)}
                                {col.items.length === 0 && (
                                    <div className="h-full flex items-center justify-center opacity-5">
                                        <div className="w-10 h-10 border-2 border-current rounded-full" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <TicketDetail
                ticketId={selectedTicketId}
                onClose={closeDetail}
            />
        </>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-[#0d161d]" />}>
            <DashboardContent />
        </Suspense>
    )
}

"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { managerService } from '@/services/api';
import {
    Building2,
    Ticket as TicketIcon,
    Star,
    Search,
    MoreHorizontal,
    Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TicketDetail } from '@/components/TicketDetail';

function ManagersContent() {
    const [managers, setManagers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const searchParams = useSearchParams();
    const router = useRouter();
    const selectedTicketId = searchParams.get('ticketId');

    useEffect(() => {
        async function loadManagers() {
            try {
                const { data } = await managerService.getManagers();
                setManagers(data.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadManagers();
    }, []);

    const closeDetail = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('ticketId');
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const filteredManagers = managers.filter(m =>
        m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.office?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="flex flex-col h-full bg-[#0d161d] overflow-hidden">
                <div className="h-14 bg-[#111b21] border-b border-[#233642] flex items-center px-4 justify-between shrink-0 z-30">
                    <div className="flex items-center gap-4">
                        <h1 className="text-foreground font-bold text-sm uppercase tracking-wider">КОМАНДА</h1>
                        <div className="h-6 w-[1px] bg-[#233642]" />
                        <div className="relative group">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5b6f7c]" />
                            <input
                                type="text"
                                placeholder="Поиск менеджера..."
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent text-xs pl-9 pr-4 py-1.5 rounded-md border border-transparent focus:border-[#3489db] focus:bg-[#182833] focus:outline-none w-64 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-[11px] text-[#5b6f7c] font-bold uppercase tracking-tighter">
                            {filteredManagers.length} <span className="opacity-60 font-medium">сотрудников</span>
                        </div>
                        <div className="h-6 w-[1px] bg-[#233642]" />
                        <button className="text-[#5b6f7c] hover:text-white transition-colors p-2">
                            <MoreHorizontal size={20} />
                        </button>
                        <button className="bg-[#3489db] hover:bg-[#3b9cf7] text-white px-5 py-2 rounded flex items-center gap-2 text-[11px] font-black shadow-lg shadow-primary/10 transition-all uppercase tracking-tight active:scale-95">
                            <Plus size={16} strokeWidth={3} />
                            Добавить
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredManagers.map((manager, idx) => (
                            <motion.div
                                key={manager.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02 }}
                                className="bg-[#182833] border border-[#233642] p-5 rounded-lg hover:border-[#3489db]/40 transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded bg-[#111b21] flex items-center justify-center font-bold text-[#3489db] border border-[#233642]">
                                            {manager.fullName[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-[#cbd3d9] group-hover:text-[#3489db] transition-colors">
                                                {manager.fullName}
                                            </h3>
                                            <p className="text-[10px] text-[#5b6f7c] uppercase font-bold tracking-widest">
                                                {manager.position.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    {manager.skills.includes('VIP') && (
                                        <div className="bg-amber-500/10 p-1 rounded">
                                            <Star size={14} className="text-amber-500 fill-amber-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-[11px] text-[#cbd3d9]">
                                        <Building2 size={14} className="text-[#5b6f7c]" />
                                        <span>{manager.office?.name || 'Удаленно'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-[#cbd3d9]">
                                        <TicketIcon size={14} className="text-[#5b6f7c]" />
                                        <span>{manager.activeTicketCount} активных тикетов</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-[#233642]">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[10px] text-[#5b6f7c] font-bold uppercase tracking-wider">Загрузка</span>
                                        <span className="text-[10px] text-[#cbd3d9] font-bold">{manager.activeTicketCount}/10</span>
                                    </div>
                                    <div className="w-full h-1 bg-[#111b21] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((manager.activeTicketCount / 10) * 100, 100)}%` }}
                                            className={`h-full transition-all ${manager.activeTicketCount >= 8 ? 'bg-red-500' :
                                                    manager.activeTicketCount >= 5 ? 'bg-amber-500' : 'bg-[#3489db]'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            <TicketDetail
                ticketId={selectedTicketId}
                onClose={closeDetail}
            />
        </>
    );
}

export default function ManagersPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-[#0d161d]" />}>
            <ManagersContent />
        </Suspense>
    );
}

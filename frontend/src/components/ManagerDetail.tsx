"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCircle, Phone, Mail, MapPin, Building2, Briefcase, Award, Ticket, ArrowRight, ShieldAlert } from 'lucide-react';
import { managerService } from '@/services/api';
import { TicketCard } from './TicketCard';

interface ManagerDetailProps {
    managerId: string | null;
    onClose: () => void;
}

export function ManagerDetail({ managerId, onClose }: ManagerDetailProps) {
    const [manager, setManager] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (managerId) {
            setLoading(true);
            managerService.getManagerById(managerId)
                .then(res => setManager(res.data.data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        } else {
            setManager(null);
        }
    }, [managerId]);

    if (!managerId) return null;

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
                    className="relative w-full max-w-2xl bg-[#0f171c] h-full shadow-2xl flex flex-col border-l border-[#233642]"
                >
                    {/* Header */}
                    <div className="h-16 bg-[#182833] border-b border-[#233642] flex items-center px-8 justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <UserCircle size={18} className="text-primary" />
                            </div>
                            <div>
                                <h2 className="text-white font-black text-sm uppercase tracking-wider">
                                    КАРТОЧКА МЕНЕДЖЕРА
                                </h2>
                                <p className="text-[10px] text-[#5b6f7c] font-bold uppercase tracking-tighter">Информация и текущая загрузка</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-[#5b6f7c] hover:text-white transition-all hover:rotate-90 bg-[#0d161d] p-2 rounded-xl border border-[#233642]">
                            <X size={20} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : manager ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                            {/* Profile Header */}
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-2xl bg-[#111b21] border border-[#233642] flex items-center justify-center shadow-inner">
                                    <span className="text-4xl font-black text-[#3489db]">
                                        {manager.fullName?.[0]?.toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-white mb-2">{manager.fullName}</h1>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Briefcase size={14} className="text-[#5b6f7c]" />
                                        <span className="text-xs font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                                            {manager.position.replace(/_/g, ' ')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium text-[#cbd3d9]">
                                        <div className="flex items-center gap-1.5">
                                            <Building2 size={14} className="text-[#5b6f7c]" />
                                            {manager.office?.name || 'Удаленно'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Skills & Competencies */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-[#5b6f7c] uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Award size={14} /> Компетенции
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {manager.skills?.map((skill: string) => (
                                        <span key={skill} className={`px-3 py-1 text-xs font-bold rounded border ${skill === 'VIP' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-[#182833] text-white border-[#233642]'}`}>
                                            {skill}
                                        </span>
                                    ))}
                                    {(!manager.skills || manager.skills.length === 0) && (
                                        <span className="text-xs text-[#5b6f7c] italic">Специализированные навыки не указаны</span>
                                    )}
                                </div>
                            </div>

                            {/* Workload Stats */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-[#5b6f7c] uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Ticket size={14} /> Текущая загрузка
                                </h3>
                                <div className="bg-[#182833] border border-[#233642] p-6 rounded-2xl">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <div className="text-3xl font-black text-white">{manager.activeTicketCount}</div>
                                            <div className="text-[10px] text-[#5b6f7c] font-bold uppercase tracking-wider">Активных тикетов</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-[#cbd3d9]">Лимит: 50</div>
                                            <div className={`text-[10px] uppercase font-black ${manager.activeTicketCount >= 20 ? 'text-red-500' : manager.activeTicketCount >= 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                {manager.activeTicketCount >= 20 ? 'Высокая нагрузка' : manager.activeTicketCount >= 10 ? 'Средняя нагрузка' : 'Свободен'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-[#0d161d] rounded-full overflow-hidden border border-[#233642]">
                                        <div
                                            className={`h-full transition-all ${manager.activeTicketCount >= 20 ? 'bg-red-500' : manager.activeTicketCount >= 10 ? 'bg-amber-500' : 'bg-[#3489db]'}`}
                                            style={{ width: `${Math.min((manager.activeTicketCount / 50) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Active Tickets List */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-[#5b6f7c] uppercase tracking-[0.2em] flex items-center gap-2 pb-2 border-b border-[#233642]">
                                    <ArrowRight size={14} /> Обращения в работе
                                </h3>
                                {manager.tickets && manager.tickets.length > 0 ? (
                                    <div className="space-y-2">
                                        {manager.tickets.filter((t: any) => !t.closedAt).map((ticket: any) => (
                                            <TicketCard key={ticket.id} ticket={ticket} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-[#182833]/30 border border-[#233642] rounded-xl border-dashed">
                                        <ShieldAlert size={24} className="mx-auto text-[#5b6f7c] mb-2 opacity-50" />
                                        <p className="text-xs text-[#5b6f7c] font-medium">Нет активных обращений</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8 text-center">
                            <p className="text-[#5b6f7c]">Не удалось загрузить данные менеджера</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

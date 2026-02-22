"use client";

import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';

export interface Ticket {
    id: string;
    description: string;
    segment: string;
    city: string;
    createdAt: string;
    manager?: { id: string; fullName: string };
    analysis?: {
        type: string;
        priority: number;
        summary: string;
    };
    attachments?: string;
    clientGuid?: string;
}

export function TicketCard({ ticket }: { ticket: Ticket }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleOpen = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('ticketId', ticket.id);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const dateStr = new Date(ticket.createdAt).toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleOpen}
            className="bg-[#182833] border border-[#233642] p-2.5 rounded shadow-sm hover:bg-[#1c2e3b] transition-colors cursor-pointer group mb-2"
        >
            <div className="flex justify-between items-start mb-1 text-[10px]">
                <div className="flex flex-col">
                    <span className="text-foreground/60 font-medium truncate max-w-[120px]">
                        {ticket.manager?.fullName || 'Без менеджера'}
                    </span>
                    <span className="text-[#3489db] group-hover:underline text-[11px] font-bold mt-0.5">
                        #{ticket.id.slice(0, 7).toUpperCase()}
                    </span>
                </div>
                <span className="text-[#5b6f7c] tabular-nums">{dateStr}</span>
            </div>

            <p className="text-[11px] text-[#cbd3d9] line-clamp-2 leading-[1.3] font-medium">
                {ticket.description}
            </p>

            {ticket.attachments && (ticket.attachments.startsWith('data:image') || ticket.attachments.match(/\.(jpeg|jpg|png|gif|webp)$/i) || (ticket.attachments.length > 100 && !ticket.attachments.includes(' '))) && (
                <div className="mt-2 w-full h-16 rounded overflow-hidden border border-[#233642]/50 bg-black/20">
                    <img
                        src={ticket.attachments.startsWith('data:') ? ticket.attachments : `data:image/jpeg;base64,${ticket.attachments}`}
                        alt="Вложение"
                        className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                    />
                </div>
            )}

            <div className="flex items-center justify-between text-[10px] mt-2">
                <div className="flex flex-wrap gap-1.5 items-center">
                    <span className={`px-1 rounded-[2px] font-bold text-[9px] whitespace-nowrap ${ticket.segment === 'VIP' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/20' : ticket.segment === 'PRIORITY' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : 'bg-slate-500/20 text-slate-400 border border-slate-500/20'
                        }`}>
                        {ticket.segment === 'VIP' ? 'VIP' : ticket.segment === 'PRIORITY' ? 'ПРИОР' : 'МАСС'}
                    </span>
                    {ticket.analysis?.type && (
                        <span className="px-1 rounded-[2px] bg-primary/10 text-primary text-[9px] font-medium border border-primary/20 whitespace-nowrap">
                            {ticket.analysis.type.replace(/_/g, ' ')}
                        </span>
                    )}
                    {ticket.city && (
                        <span className="px-1 rounded-[2px] bg-white/5 text-[#8899a6] text-[9px] border border-white/10 whitespace-nowrap max-w-[80px] truncate" title={ticket.city}>
                            {ticket.city}
                        </span>
                    )}
                </div>
                {ticket.analysis && (
                    <span className="text-white bg-red-500/20 px-1 rounded-[2px] border border-red-500/30 font-mono tabular-nums flex-shrink-0 font-bold ml-2">P{ticket.analysis.priority}</span>
                )}
            </div>
        </motion.div>
    );
}

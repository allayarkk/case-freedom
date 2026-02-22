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
            layout
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
                        #{ticket.id.slice(-6).toUpperCase()}
                    </span>
                </div>
                <span className="text-[#5b6f7c] tabular-nums">{dateStr}</span>
            </div>

            <p className="text-[11px] text-[#cbd3d9] line-clamp-2 leading-[1.3] mb-2 font-medium">
                {ticket.description}
            </p>

            <div className="flex items-center justify-between text-[10px]">
                <div className="flex gap-1.5 items-center">
                    <span className={`px-1 rounded-[2px] font-bold text-[9px] ${ticket.segment === 'VIP' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                        {ticket.segment === 'VIP' ? 'VIP' : ticket.segment === 'PRIORITY' ? 'ПРИОР' : 'МАСС'}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                </div>
                {ticket.analysis && (
                    <span className="text-[#5b6f7c] font-mono tabular-nums">P{ticket.analysis.priority}</span>
                )}
            </div>
        </motion.div>
    );
}

"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ticketService } from '@/services/api';
import { FileText, Search, Filter, ChevronRight, MapPin, BrainCircuit } from 'lucide-react';

export default function TicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadTickets() {
            try {
                const { data } = await ticketService.getTickets();
                setTickets(data.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadTickets();
    }, []);

    return (
        <div className="p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Ticket Registry</h2>
                    <p className="text-slate-400">View and manage all client inquiries and their AI routing results</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-primary/50 outline-none w-64 transition-all"
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/10">
                        <Filter size={18} />
                        Filters
                    </button>
                </div>
            </header>

            <Card className="p-0 overflow-hidden border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/5 text-[10px] text-slate-500 uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4">ID / Segment</th>
                            <th className="px-6 py-4">Client Description</th>
                            <th className="px-6 py-4">AI Analysis</th>
                            <th className="px-6 py-4">Geo / Office</th>
                            <th className="px-6 py-4">Manager</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {tickets.length === 0 ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-700">Loading registry data...</td>
                                </tr>
                            ))
                        ) : (
                            tickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-mono text-xs text-slate-300">#{ticket.id.slice(-6).toUpperCase()}</span>
                                            <span className={`text-[10px] font-bold ${ticket.segment === 'VIP' ? 'text-primary' : 'text-slate-500'}`}>
                                                {ticket.segment}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <p className="text-sm line-clamp-2 text-slate-300">{ticket.description}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {ticket.analysis && (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <BrainCircuit size={12} className="text-primary" />
                                                    <span className="text-xs font-bold text-slate-200">{ticket.analysis.type}</span>
                                                </div>
                                                <div className="flex gap-2 text-[10px]">
                                                    <span className="text-slate-500">Sent: {ticket.analysis.sentiment}</span>
                                                    <span className="text-primary/70">Prio: {ticket.analysis.priority}</span>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={12} className="text-slate-500" />
                                                <span className="text-xs text-slate-300">{ticket.office?.name || 'Unassigned'}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-600 line-clamp-1">{ticket.city}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-[10px]">
                                                {ticket.manager?.fullName[0]}
                                            </div>
                                            <span className="text-sm text-slate-300">{ticket.manager?.fullName || 'Searching...'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-all">
                                            <ChevronRight size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}

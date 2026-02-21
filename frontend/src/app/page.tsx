"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { analyticsService, ticketService } from '@/services/api';
import { LayoutDashboard, Users, FileText, PieChart, Upload, ArrowRight } from 'lucide-react';

export default function Dashboard() {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                const { data } = await analyticsService.getKanbanStats();
                setStats(data.data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    const kanbanColumns = [
        { title: 'Жалоба', type: 'COMPLAINT', color: 'bg-red-500' },
        { title: 'Смена данных', type: 'DATA_CHANGE', color: 'bg-blue-500' },
        { title: 'Консультация', type: 'CONSULTATION', color: 'bg-green-500' },
        { title: 'Претензия', type: 'CLAIM', color: 'bg-orange-500' },
        { title: 'Проблемы приложения', type: 'APP_MALFUNCTION', color: 'bg-purple-500' },
    ];

    return (
        <div className="flex h-screen bg-background text-slate-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-8 glass">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-xl text-white">F</div>
                    <h1 className="text-xl font-bold tracking-tight">FIRE Engine</h1>
                </div>

                <nav className="flex flex-col gap-2">
                    <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
                    <NavItem icon={<Users size={20} />} label="Managers" />
                    <NavItem icon={<FileText size={20} />} label="Tickets" />
                    <NavItem icon={<PieChart size={20} />} label="Analytics" />
                    <NavItem icon={<Upload size={20} />} label="Import CSV" />
                </nav>

                <div className="mt-auto">
                    <Card className="bg-primary/10 border-primary/20 p-4">
                        <p className="text-xs text-primary font-bold uppercase tracking-wider mb-2">AI Assistant</p>
                        <p className="text-sm text-slate-300 mb-4">Ask anything about your tickets</p>
                        <button className="w-full py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-bold transition-colors">
                            Chat
                        </button>
                    </Card>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-8">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold">Dashboard</h2>
                        <p className="text-slate-400">Intelligent Routing Status</p>
                    </div>
                    <div className="flex gap-4">
                        <Card className="px-6 py-2 flex flex-col items-center">
                            <span className="text-2xl font-bold">142</span>
                            <span className="text-xs text-slate-400 uppercase">Total Tickets</span>
                        </Card>
                        <Card className="px-6 py-2 flex flex-col items-center border-primary/50">
                            <span className="text-2xl font-bold text-primary">89%</span>
                            <span className="text-xs text-slate-400 uppercase">Auto Routed</span>
                        </Card>
                    </div>
                </header>

                {/* Kanban Board */}
                <div className="grid grid-cols-5 gap-6 h-[calc(100vh-250px)]">
                    {kanbanColumns.map((col, idx) => (
                        <div key={col.type} className="flex flex-col gap-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${col.color}`} />
                                    <h3 className="font-bold text-sm uppercase tracking-wider">{col.title}</h3>
                                </div>
                                <span className="bg-white/5 px-2 py-0.5 rounded text-xs text-slate-400">
                                    {stats?.find(s => s.type === col.type)?.count || 0}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
                                {[1, 2, 3].map(i => (
                                    <TicketCard key={i} index={i} type={col.type} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
    return (
        <button className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}>
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    );
}

function TicketCard({ index, type }: { index: number, type: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card className="p-4 flex flex-col gap-3 cursor-pointer hover:border-primary/30 group">
                <div className="flex justify-between items-start">
                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-slate-400 font-mono">TKT-829{index}</span>
                    <span className="text-[10px] text-primary font-bold">VIP</span>
                </div>
                <p className="text-sm font-medium line-clamp-2 text-slate-200">
                    Client inquiry about {type.toLowerCase().replace('_', ' ')} logic...
                </p>
                <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-secondary/50 border border-white/20" />
                        <span className="text-[10px] text-slate-400">Manager {index}</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-600 group-hover:text-primary transition-colors" />
                </div>
            </Card>
        </motion.div>
    );
}

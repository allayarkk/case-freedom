"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { managerService } from '@/services/api';
import { Users, Building2, Ticket, Star } from 'lucide-react';

export default function ManagersPage() {
    const [managers, setManagers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadManagers() {
            try {
                const { data } = await managerService.getManagers();
                setManagers(data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadManagers();
    }, []);

    return (
        <div className="p-8">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Team Overview</h2>
                    <p className="text-slate-400">Manage your specialists and monitor their current capacity</p>
                </div>
                <div className="flex gap-4">
                    {/* Summary stats */}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {managers.map((manager) => (
                    <Card key={manager.id} className="p-6 flex flex-col gap-4 border-white/5 hover:border-primary/20">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-xl">
                                    {manager.fullName[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{manager.fullName}</h3>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest">{manager.position.replace('_', ' ')}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                {manager.skills.includes('VIP') && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 my-2">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Building2 size={16} />
                                <span>{manager.office?.name} Office</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Ticket size={16} />
                                <span>{manager.activeTicketCount} tickets in work</span>
                            </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-white/5 flex gap-2 overflow-x-auto">
                            {manager.skills.map((skill: string) => (
                                <span key={skill} className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold text-slate-400">
                                    {skill}
                                </span>
                            ))}
                        </div>

                        <div className="mt-2">
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${Math.min((manager.activeTicketCount / 10) * 100, 100)}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-right mt-1 text-slate-600">Capacity: {manager.activeTicketCount}/10</p>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

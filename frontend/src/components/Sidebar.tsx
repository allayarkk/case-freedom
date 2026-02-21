"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, PieChart, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/" },
        { icon: <Users size={20} />, label: "Managers", href: "/managers" },
        { icon: <FileText size={20} />, label: "Tickets", href: "/tickets" },
        { icon: <PieChart size={20} />, label: "Analytics", href: "/analytics" },
        { icon: <Upload size={20} />, label: "Import CSV", href: "/import" },
    ];

    return (
        <aside className="w-64 border-r border-white/10 p-6 flex flex-col gap-8 glass h-screen shrink-0 sticky top-0">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center font-bold text-xl text-white">F</div>
                <h1 className="text-xl font-bold tracking-tight">FIRE Engine</h1>
            </div>

            <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === item.href ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'}`}
                    >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
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
    );
}

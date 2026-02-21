"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users2,
    Ticket,
    BarChart3,
    UploadCloud,
    Settings,
    Mail,
    Search
} from 'lucide-react';

const MENU_ITEMS = [
    { icon: LayoutDashboard, label: 'Рабочий стол', href: '/' },
    { icon: Users2, label: 'Менеджеры', href: '/managers' },
    { icon: Ticket, label: 'Списки', href: '/tickets' },
    { icon: BarChart3, label: 'Аналитика', href: '/analytics' },
    { icon: Mail, label: 'Почта', href: '#' },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-[60px] bg-[#111b21] border-r border-[#233642] flex flex-col items-center py-4 shrink-0 h-screen z-50">
            <div className="w-10 h-10 bg-primary/20 rounded-md flex items-center justify-center mb-6">
                <span className="text-primary font-bold text-xl">F</span>
            </div>

            <nav className="flex flex-col gap-6 w-full">
                {MENU_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            className={`flex items-center justify-center py-1 transition-all relative group ${isActive ? 'text-white' : 'text-[#5b6f7c] hover:text-white'
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
                            )}
                            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />

                            <div className="absolute left-14 bg-[#182833] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-[#233642]">
                                {item.label}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto flex flex-col gap-6 pb-4">
                <Link href="/import" className="text-[#5b6f7c] hover:text-white">
                    <UploadCloud size={22} />
                </Link>
                <Link href="#" className="text-[#5b6f7c] hover:text-white">
                    <Settings size={22} />
                </Link>
            </div>
        </div>
    );
}

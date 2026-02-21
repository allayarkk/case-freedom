"use client";

import { Search, MoreHorizontal, LayoutGrid, Building2, User } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type GroupingMode = 'priority' | 'office' | 'manager';

interface DashboardToolbarProps {
    groupingMode: GroupingMode;
    onGroupingChange: (mode: GroupingMode) => void;
    onSearch: (term: string) => void;
}

export function DashboardToolbar({
    groupingMode,
    onGroupingChange,
    onSearch
}: DashboardToolbarProps) {
    const [showMenu, setShowMenu] = useState(false);

    const modes: { id: GroupingMode; label: string; icon: any }[] = [
        { id: 'priority', label: 'По приоритетам', icon: LayoutGrid },
        { id: 'office', label: 'По офисам (городам)', icon: Building2 },
        { id: 'manager', label: 'По менеджерам', icon: User },
    ];

    return (
        <div className="h-14 bg-[#111b21] border-b border-[#233642] flex items-center px-4 justify-between shrink-0 relative z-30">
            <div className="flex items-center gap-4">
                <h1 className="text-foreground font-bold text-sm uppercase tracking-wider">ВОРОНКА ОБРАЩЕНИЙ</h1>
                <div className="h-6 w-[1px] bg-[#233642]" />
                <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5b6f7c]" />
                    <input
                        type="text"
                        placeholder="Поиск и фильтр"
                        onChange={(e) => onSearch(e.target.value)}
                        className="bg-transparent text-xs pl-9 pr-4 py-1.5 rounded-md border border-transparent focus:border-[#3489db] focus:bg-[#182833] focus:outline-none w-64 transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-[#5b6f7c] hover:text-white transition-colors p-2 hover:bg-white/5 rounded-md flex items-center gap-1 group"
                    >
                        <MoreHorizontal size={20} />
                    </button>

                    <AnimatePresence>
                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                    className="absolute right-0 mt-2 w-56 bg-[#182833] border border-[#233642] rounded-lg shadow-2xl z-50 py-1.5 overflow-hidden"
                                >
                                    <div className="px-4 py-2 bg-[#111b21]/50 border-b border-[#233642] mb-1">
                                        <p className="text-[10px] font-bold text-[#5b6f7c] uppercase tracking-widest leading-none mb-1">Настройки вида</p>
                                    </div>

                                    {modes.map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => {
                                                onGroupingChange(mode.id);
                                                setShowMenu(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-[11px] transition-all flex items-center justify-between group ${groupingMode === mode.id
                                                ? 'bg-primary/10 text-primary font-bold'
                                                : 'text-[#cbd3d9] hover:bg-white/5'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <mode.icon size={14} className={groupingMode === mode.id ? 'text-primary' : 'text-[#5b6f7c] group-hover:text-white'} />
                                                {mode.label}
                                            </div>
                                        </button>
                                    ))}

                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>


            </div>
        </div>
    );
}

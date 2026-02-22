"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { managerService, importService } from '@/services/api';
import {
    Building2,
    Ticket as TicketIcon,
    Star,
    Search,
    Plus,
    X,
    Upload,
    Loader2,
    CheckCircle2,
    FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TicketDetail } from '@/components/TicketDetail';
import { ManagerDetail } from '@/components/ManagerDetail';

function ManagersContent() {
    const [managers, setManagers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [importCsv, setImportCsv] = useState('');
    const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [importResult, setImportResult] = useState<{ created: number; failed: number } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const selectedTicketId = searchParams.get('ticketId');
    const selectedManagerId = searchParams.get('managerId');

    const loadManagers = async () => {
        try {
            const { data } = await managerService.getManagers();
            setManagers(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadManagers();
    }, []);

    const closeDetail = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('ticketId');
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const closeManagerDetail = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('managerId');
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const openManagerDetail = (id: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('managerId', id);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            setImportCsv(event.target?.result as string);
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!importCsv.trim()) return;
        setImportStatus('loading');
        setImportResult(null);

        try {
            const response = await importService.importManagers(importCsv);
            const result = response.data.data;
            setImportResult({ created: result.created ?? 0, failed: result.failed ?? 0 });
            setImportStatus('done');

            // Reload managers to show new entries with animation
            await loadManagers();

            // Auto-close after success
            setTimeout(() => {
                setShowImportModal(false);
                setImportStatus('idle');
                setImportCsv('');
                setImportResult(null);
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setImportResult({ created: 0, failed: 1 });
            setImportStatus('done');
        }
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
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="bg-[#3489db] hover:bg-[#3b9cf7] text-white px-5 py-2 rounded flex items-center gap-2 text-[11px] font-black shadow-lg shadow-primary/10 transition-all uppercase tracking-tight active:scale-95"
                        >
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
                                onClick={() => openManagerDetail(manager.id)}
                                className="bg-[#182833] border border-[#233642] p-5 rounded-lg hover:border-[#3489db]/40 cursor-pointer transition-all group"
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
                                                {manager.position.replace(/_/g, ' ')}
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
                                    {manager.skills.length > 0 && (
                                        <div className="flex gap-1 flex-wrap mt-1">
                                            {manager.skills.map((s: string) => (
                                                <span key={s} className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-[#233642]">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[10px] text-[#5b6f7c] font-bold uppercase tracking-wider">Загрузка (Активные тикеты)</span>
                                        <span className="text-[10px] text-[#cbd3d9] font-bold">{manager.activeTicketCount}</span>
                                    </div>
                                    <div className="w-full h-1 bg-[#111b21] rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((manager.activeTicketCount / 50) * 100, 100)}%` }}
                                            className={`h-full transition-all ${manager.activeTicketCount >= 20 ? 'bg-red-500' :
                                                manager.activeTicketCount >= 10 ? 'bg-amber-500' : 'bg-[#3489db]'
                                                }`}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Import Modal */}
            <AnimatePresence>
                {showImportModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { if (importStatus !== 'loading') { setShowImportModal(false); setImportCsv(''); setImportStatus('idle'); } }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative bg-[#111b21] border border-[#233642] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#233642]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Upload size={18} className="text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-white">Импорт менеджеров</h2>
                                        <p className="text-[10px] text-[#5b6f7c] uppercase font-bold tracking-wider">CSV формат</p>
                                    </div>
                                </div>
                                {importStatus !== 'loading' && (
                                    <button
                                        onClick={() => { setShowImportModal(false); setImportCsv(''); setImportStatus('idle'); }}
                                        className="text-[#5b6f7c] hover:text-white transition-colors p-1.5 rounded-md border border-[#233642] bg-[#0d161d]"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-4">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold transition-colors border border-primary/20"
                                    >
                                        <FileText size={14} />
                                        Выбрать файл
                                    </button>
                                    <button
                                        onClick={() => setImportCsv('ФИО,Должность,Навыки,Офис\nИванов Иван,SPECIALIST,"VIP,KZ",Астана')}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#cbd3d9] text-[11px] font-bold transition-colors border border-white/5"
                                    >
                                        Загрузить пример
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".csv"
                                        className="hidden"
                                    />
                                </div>

                                <div className="relative">
                                    <textarea
                                        className="w-full h-40 bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-[11px] text-slate-300 focus:border-primary/50 outline-none transition-all resize-none placeholder:text-slate-700"
                                        placeholder="Вставьте CSV или выберите файл..."
                                        value={importCsv}
                                        onChange={e => setImportCsv(e.target.value)}
                                        disabled={importStatus === 'loading'}
                                    />
                                    {importCsv && (
                                        <div className="absolute top-3 right-3 text-[9px] text-[#5b6f7c] font-mono bg-black/40 px-2 py-0.5 rounded">
                                            {importCsv.split('\n').filter(Boolean).length} строк
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleImport}
                                    disabled={importStatus === 'loading' || !importCsv.trim()}
                                    className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-sm transition-all ${importStatus === 'loading'
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : importStatus === 'done'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                            : !importCsv.trim()
                                                ? 'bg-primary/20 text-primary/40 cursor-not-allowed'
                                                : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 active:scale-[0.99]'
                                        }`}
                                >
                                    {importStatus === 'loading' ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Загрузка...
                                        </>
                                    ) : importStatus === 'done' ? (
                                        <>
                                            <CheckCircle2 size={18} />
                                            {importResult ? `${importResult.created} добавлено` : 'Готово'}
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={18} />
                                            Импортировать менеджеров
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <TicketDetail
                ticketId={selectedTicketId}
                onClose={closeDetail}
            />

            <ManagerDetail
                managerId={selectedManagerId}
                onClose={closeManagerDetail}
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

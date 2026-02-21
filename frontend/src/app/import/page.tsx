"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { importService, ticketService, analyticsService } from '@/services/api';
import {
    Building2,
    Users,
    FileText,
    Upload,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronRight,
    Info,
    FileSearch,
    Zap,
    BrainCircuit,
    MapPin,
    ArrowRight,
    Clock,
} from 'lucide-react';

type TabKey = 'offices' | 'managers' | 'tickets';
type Status = 'idle' | 'loading' | 'success' | 'error' | 'processing';

interface ImportResult {
    created?: number;
    processed?: number;
    skipped?: number;
    failed?: number;
    errors?: string[];
}

interface TicketProgress {
    id: string;
    description: string;
    city: string;
    status: 'pending' | 'ai' | 'geo' | 'routing' | 'done' | 'error';
    performance?: {
        ai: number;
        geo: number;
        routing: number;
        total: number;
    };
    error?: string;
    managerName?: string;
}

const TABS: Array<{
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    description: string;
    columns: string;
    example: string;
    action: (csv: string) => Promise<{ data: { data: ImportResult } }>;
    order: number;
}> = [
        {
            key: 'offices',
            label: 'Offices',
            icon: <Building2 size={16} />,
            description: 'Импорт офисов — база для гео-роутинга. Офисы хранят координаты для поиска ближайшего отделения.',
            order: 1,
            columns: 'Название, Адрес, Широта (опц.), Долгота (опц.)',
            example:
                'Название,Адрес,Широта,Долгота\nАстана,Достык 16 БЦ Talan,51.169,71.449\nАлматы,пр-т Аль-Фараби 77/7,43.238,76.945',
            action: (csv) => importService.importOffices(csv) as any,
        },
        {
            key: 'managers',
            label: 'Managers',
            icon: <Users size={16} />,
            description: 'Импорт менеджеров — офисы должны быть загружены заранее для привязки.',
            order: 2,
            columns: 'ФИО, Должность, Навыки, Офис',
            example:
                'ФИО,Должность,Навыки,Офис\nСергей Власов,LEAD_SPECIALIST,"VIP,ENG,KZ",Алматы\nЕлена Ким,LEAD_SPECIALIST,"VIP,KZ",Астана\nАлексей Тен,SPECIALIST,"KZ,ENG",Астана',
            action: (csv) => importService.importManagers(csv) as any,
        },
        {
            key: 'tickets',
            label: 'Tickets',
            icon: <FileText size={16} />,
            description: 'Импорт обращений — движок автоматически выполнит AI-анализ и назначит менеджера.',
            order: 3,
            columns: 'GUID клиента, Пол клиента, Дата рождения, Сегмент клиента, Описание, Вложения, Страна, Область, Населённый пункт, Улица, Дом',
            example:
                'GUID клиента,Пол клиента,Дата рождения,Сегмент клиента,Описание,Страна,Область,Населённый пункт,Улица,Дом\nfe44694a-10ed-f011-8406-0022481ba5f0,Мужской,1998-10-02,VIP,"Добрый день! Мне нужно срочно изменить паспортные данные в моем профиле, так как я его обновил. Прикрепляю скан.",Казахстан,город Астана,Есильский район,улица Достык,16\ntkt-9922,Женский,1985-05-12,MASS,"Не могу войти в приложение, пишет ошибка сети. Проверьте пожалуйста.",Казахстан,Алматинская обл.,Илийский район,с. Отеген батыр,ул. Ленина,15',
            action: (csv) => importService.importTickets(csv) as any,
        },
    ];

/** 
 * Robust CSV parser that handles quotes and newlines within fields.
 */
function parseCSVHandcrafted(csv: string) {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    // Normalize newlines
    const content = csv.replace(/\r\n/g, '\n');

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentField += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentField.trim());
            currentField = '';
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentField.trim());
            rows.push(currentRow);
            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }

    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    if (rows.length < 1) return [];

    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).filter(row => row.length > 0).map(row => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
            obj[h] = row[i] || '';
        });
        return obj;
    });
}

function getVal(row: Record<string, string>, keys: string[]): string {
    for (const pk of keys) {
        const found = Object.keys(row).find(rk => rk.trim().toLowerCase() === pk.toLowerCase());
        if (found) return row[found];
    }
    return '';
}

export default function ImportPage() {
    const [activeTab, setActiveTab] = useState<TabKey>('offices');
    const [csvValues, setCsvValues] = useState<Record<TabKey, string>>({
        offices: '',
        managers: '',
        tickets: '',
    });
    const [statuses, setStatuses] = useState<Record<TabKey, Status>>({
        offices: 'idle',
        managers: 'idle',
        tickets: 'idle',
    });
    const [results, setResults] = useState<Record<TabKey, ImportResult | null>>({
        offices: null,
        managers: null,
        tickets: null,
    });

    const [processingQueue, setProcessingQueue] = useState<TicketProgress[]>([]);
    const [processedCount, setProcessedCount] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const tab = TABS.find(t => t.key === activeTab)!;
    const csv = csvValues[activeTab];
    const status = statuses[activeTab];
    const result = results[activeTab];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setCsvValues(v => ({ ...v, [activeTab]: text }));
        };
        reader.readAsText(file);
    };

    /** Real-time processing for tickets */
    async function processTicketsIndividually() {
        const rows = parseCSVHandcrafted(csv);
        if (rows.length === 0) return;

        setStatuses(s => ({ ...s, tickets: 'processing' }));
        setProcessedCount(0);

        let sessionId: string | undefined;
        try {
            const sessionRes = await analyticsService.createImportSession({
                totalTickets: rows.length,
                name: `Import ${new Date().toLocaleTimeString()} (${rows.length} tickets)`
            });
            sessionId = sessionRes.data.data.id;
        } catch (e) {
            console.error('Failed to create session', e);
        }

        const initialQueue: TicketProgress[] = rows.map((row, i) => ({
            id: `temp-${i}`,
            description: getVal(row, ['Описание', 'Description']),
            city: getVal(row, ['Населённый пункт', 'Город', 'City']),
            status: 'pending'
        }));
        setProcessingQueue(initialQueue);

        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            setProcessingQueue(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'ai' } : p));

            try {
                const response = await ticketService.createTicket({
                    clientGuid: getVal(row, ['GUID клиента', 'GUID', 'clientGuid']),
                    gender: getVal(row, ['Пол клиента', 'Пол']),
                    dateOfBirth: getVal(row, ['Дата рождения']),
                    description: getVal(row, ['Описание', 'Description']),
                    attachments: getVal(row, ['Вложения', 'Attachments']),
                    segment: getVal(row, ['Сегмент клиента', 'Сегмент']),
                    country: getVal(row, ['Страна']),
                    oblast: getVal(row, ['Область']),
                    city: getVal(row, ['Населённый пункт', 'Город', 'City']),
                    street: getVal(row, ['Улица']),
                    houseNumber: getVal(row, ['Дом']),
                    importSessionId: sessionId
                });

                const data = response.data.data;
                success++;
                setProcessingQueue(prev => prev.map((p, idx) => idx === i ? {
                    ...p,
                    status: 'done',
                    performance: data.performance,
                    managerName: data.ticket.manager?.fullName
                } : p));
            } catch (err: any) {
                failed++;
                const msg = err.response?.data?.error?.message || err.message;
                errors.push(msg);
                setProcessingQueue(prev => prev.map((p, idx) => idx === i ? { ...p, status: 'error', error: msg } : p));
            }
            setProcessedCount(prev => prev + 1);
        }

        if (sessionId) {
            await analyticsService.updateImportSessionStatus(sessionId, 'COMPLETED');
        }

        setResults(r => ({ ...r, tickets: { processed: success, failed, errors } }));
        setStatuses(s => ({ ...s, tickets: 'success' }));
    }

    async function handleImport() {
        if (!csv.trim()) return;
        if (activeTab === 'tickets') {
            processTicketsIndividually();
            return;
        }
        setStatuses(s => ({ ...s, [activeTab]: 'loading' }));
        try {
            const response = await tab.action(csv);
            setResults(r => ({ ...r, [activeTab]: response.data.data }));
            setStatuses(s => ({ ...s, [activeTab]: 'success' }));
        } catch (err: any) {
            setResults(r => ({ ...r, [activeTab]: { errors: [err.message] } }));
            setStatuses(s => ({ ...s, [activeTab]: 'error' }));
        }
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold mb-2">FIRE Import Center</h2>
                    <p className="text-slate-400">Умный импорт с живой аналитикой производительности.</p>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none border-b border-white/5 pb-4">
                {TABS.map((t, i) => (
                    <div key={t.key} className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setActiveTab(t.key)}
                            disabled={status === 'processing' || status === 'loading'}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab === t.key
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : statuses[t.key] === 'success'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                                } ${status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                                {statuses[t.key] === 'success' ? '✓' : t.order}
                            </span>
                            {t.icon}
                            {t.label}
                        </button>
                        {i < TABS.length - 1 && <ChevronRight size={16} className="text-slate-700" />}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {statuses.tickets === 'processing' ? (
                    <motion.div key="processing" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                        <Card className="p-6 border-primary/20 bg-primary/5">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Loader2 size={24} className="animate-spin text-primary" />
                                        Идет AI-обработка
                                    </h3>
                                    <p className="text-sm text-slate-400">Движок FIRE распределяет обращения в реальном времени</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-black text-primary font-mono">{processedCount}/{processingQueue.length}</span>
                                    <p className="text-[10px] text-slate-500 uppercase font-black">Готово</p>
                                </div>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(processedCount / Math.max(1, processingQueue.length)) * 100}%` }} />
                            </div>
                        </Card>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {processingQueue.map((item, i) => (
                                <div key={i} className={`p-4 rounded-xl border transition-all flex items-center gap-4 ${item.status === 'done' ? 'bg-emerald-500/5 border-emerald-500/20' :
                                        item.status === 'error' ? 'bg-red-500/5 border-red-500/20' :
                                            item.status === 'ai' ? 'bg-primary/5 border-primary/20' :
                                                'bg-white/5 border-white/5 opacity-60'
                                    }`}>
                                    <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
                                        {item.status === 'done' ? <CheckCircle2 className="text-emerald-400" /> :
                                            item.status === 'error' ? <AlertCircle className="text-red-400" /> :
                                                item.status === 'ai' ? <BrainCircuit className="text-primary animate-pulse" /> : <Clock className="text-slate-600" />}
                                    </div>
                                    <div className="grow min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[11px] font-bold text-[#cbd3d9] truncate max-w-md italic">&quot;{item.description}&quot;</span>
                                            {item.managerName && (
                                                <div className="flex items-center gap-1 text-[9px] bg-white/5 px-2 py-0.5 rounded text-[#5b6f7c] uppercase font-bold">
                                                    <ArrowRight size={10} />
                                                    {item.managerName}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-4">
                                            {item.performance ? (
                                                <div className="flex gap-3 items-center">
                                                    <span className="text-[9px] text-[#5b6f7c] font-mono">AI: {item.performance.ai}ms</span>
                                                    <span className="text-[9px] text-[#5b6f7c] font-mono">GEO: {item.performance.geo}ms</span>
                                                    <span className="text-[10px] text-white font-mono font-bold">TOTAL: {item.performance.total}ms</span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-[#5b6f7c] italic tracking-tight uppercase font-black">
                                                    {item.status === 'ai' ? 'Анализируем текст и вложения...' : 'Ожидание в очереди...'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>
                        <Card className="p-6 flex flex-col gap-6 border-white/5 relative overflow-hidden">
                            <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4 border border-white/5">
                                <Info size={18} className="text-primary mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm text-slate-200 leading-relaxed font-medium">{tab.description}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ожидаемые колонки:</p>
                                        <p className="text-[10px] text-primary/70 font-mono tracking-tight">{tab.columns}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CSV Content</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCsvValues(v => ({ ...v, [activeTab]: tab.example }))} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-400 hover:text-white transition-colors border border-white/5">
                                            <Zap size={12} className="text-amber-400" />
                                            Загрузить демо
                                        </button>
                                        <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-[10px] text-primary transition-colors border border-primary/20">
                                            <FileSearch size={12} />
                                            Выбрать файл
                                        </button>
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                                    </div>
                                </div>
                                <div className="relative group">
                                    <textarea
                                        className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-5 font-mono text-[11px] text-slate-300 focus:border-primary/50 outline-none transition-all resize-none shadow-inner"
                                        placeholder={`Вставь содержимое CSV сюда или выбери файл...`}
                                        value={csv}
                                        onChange={e => setCsvValues(v => ({ ...v, [activeTab]: e.target.value }))}
                                    />
                                    {csv.length > 0 && (
                                        <div className="absolute top-4 right-4 text-[9px] text-[#5b6f7c] font-mono bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                            {csv.split('\n').filter(Boolean).length} строчек
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button onClick={handleImport} disabled={status === 'loading' || !csv.trim()} className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all shadow-xl ${status === 'loading' ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50' : !csv.trim() ? 'bg-primary/20 text-primary/40 cursor-not-allowed border border-primary/10' : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'}`}>
                                {status === 'loading' ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                                {activeTab === 'tickets' ? 'Запустить AI Routing Engine' : `Импортировать ${tab.label}`}
                            </button>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

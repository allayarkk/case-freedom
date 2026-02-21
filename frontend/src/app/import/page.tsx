"use client";

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { importService } from '@/services/api';
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
} from 'lucide-react';

type TabKey = 'offices' | 'managers' | 'tickets';
type Status = 'idle' | 'loading' | 'success' | 'error';

interface ImportResult {
    created?: number;
    processed?: number;
    skipped?: number;
    failed?: number;
    errors?: string[];
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

    const handleLoadSample = () => {
        setCsvValues(v => ({ ...v, [activeTab]: tab.example }));
    };

    async function handleImport() {
        if (!csv.trim()) return;
        setStatuses(s => ({ ...s, [activeTab]: 'loading' }));
        setResults(r => ({ ...r, [activeTab]: null }));

        try {
            const response = await tab.action(csv);
            setResults(r => ({ ...r, [activeTab]: response.data.data }));
            setStatuses(s => ({ ...s, [activeTab]: 'success' }));
        } catch (err: any) {
            console.error(err);
            setResults(r => ({
                ...r,
                [activeTab]: { errors: [err.response?.data?.error?.message ?? err.message ?? 'Unknown error'] },
            }));
            setStatuses(s => ({ ...s, [activeTab]: 'error' }));
        }
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Import CSV</h2>
                <p className="text-slate-400">
                    Загружай данные в правильном порядке:
                    <span className="text-primary font-bold"> 1. Офисы → 2. Менеджеры → 3. Обращения</span>
                </p>
            </div>

            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                {TABS.map((t, i) => (
                    <div key={t.key} className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setActiveTab(t.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab === t.key
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : statuses[t.key] === 'success'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                                }`}
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
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                >
                    <Card className="p-6 flex flex-col gap-6 border-white/5 relative overflow-hidden">
                        <div className="flex items-start gap-3 bg-white/5 rounded-2xl p-4">
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
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    CSV Content
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleLoadSample}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-400 hover:text-white transition-colors border border-white/5"
                                    >
                                        <Zap size={12} className="text-amber-400" />
                                        Загрузить демо
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-[10px] text-primary transition-colors border border-primary/20"
                                    >
                                        <FileSearch size={12} />
                                        Выбрать файл
                                    </button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept=".csv"
                                        className="hidden"
                                    />
                                </div>
                            </div>
                            <div className="relative group">
                                <textarea
                                    className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-5 font-mono text-[11px] text-slate-300 focus:border-primary/50 outline-none transition-all resize-none placeholder:text-slate-800 focus:ring-4 focus:ring-primary/5 shadow-inner"
                                    placeholder={`Вставь содержимое CSV сюда или выбери файл...\nПример:\n${tab.example}`}
                                    value={csv}
                                    onChange={e => setCsvValues(v => ({ ...v, [activeTab]: e.target.value }))}
                                />
                                {csv.length > 0 && (
                                    <div className="absolute top-4 right-4 text-[9px] text-slate-600 font-mono bg-black/40 px-2 py-1 rounded border border-white/5">
                                        {csv.split('\n').filter(Boolean).length} строк
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleImport}
                            disabled={status === 'loading' || !csv.trim()}
                            className={`flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all shadow-xl ${status === 'loading'
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                : !csv.trim()
                                    ? 'bg-primary/20 text-primary/40 cursor-not-allowed border border-primary/10'
                                    : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20 hover:scale-[1.01] active:scale-[0.99]'
                                }`}
                        >
                            {status === 'loading' ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Upload size={20} />
                            )}
                            {status === 'loading'
                                ? 'Обработка...'
                                : !csv.trim()
                                    ? 'Напишите текст или выберите файл'
                                    : activeTab === 'tickets'
                                        ? 'Запустить AI Routing Engine'
                                        : `Импортировать ${tab.label}`}
                        </button>

                        <AnimatePresence>
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-white/5"
                                >
                                    <div className="flex gap-3">
                                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                                            <CheckCircle2 size={16} className="text-emerald-400" />
                                            <span className="text-emerald-400 font-bold text-sm">
                                                {activeTab === 'tickets' ? `${result.processed ?? 0} обработано` : `${result.created ?? 0} создано`}
                                            </span>
                                        </div>
                                        {(result.skipped ?? 0 + (result.failed ?? 0)) > 0 && (
                                            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-xl">
                                                <AlertCircle size={16} className="text-amber-400" />
                                                <span className="text-amber-400 font-bold text-sm">
                                                    {Number(result.skipped ?? 0) + Number(result.failed ?? 0)} пропущено
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {result.errors && result.errors.length > 0 && (
                                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar">
                                            {result.errors.map((e, i) => (
                                                <p key={i} className="text-[10px] text-red-400/80 font-mono mb-1 last:mb-0">[{i + 1}] {e}</p>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

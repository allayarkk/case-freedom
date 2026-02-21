"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ticketService } from '@/services/api';
import { Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ImportPage() {
    const [csv, setCsv] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleImport = async () => {
        if (!csv.trim()) return;
        setStatus('loading');
        try {
            await ticketService.importTickets(csv);
            setStatus('success');
            setMessage('CSV Data imported and routed successfully via AI Engine.');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setMessage(err.response?.data?.error?.message || 'Failed to import tickets');
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <header className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Import Tickets</h2>
                <p className="text-slate-400">Upload CSV data for automatic AI analysis and routing</p>
            </header>

            <Card className="p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-400 uppercase tracking-wider">CSV Data</label>
                    <textarea
                        className="w-full h-64 bg-black/20 border border-white/10 rounded-xl p-4 font-mono text-sm focus:border-primary/50 outline-none transition-all"
                        placeholder="Paste your CSV content here..."
                        value={csv}
                        onChange={(e) => setCsv(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleImport}
                    disabled={status === 'loading' || !csv.trim()}
                    className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                    {status === 'loading' ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <Upload size={20} />
                    )}
                    Start Routing Engine
                </button>

                {status === 'success' && (
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex items-center gap-3 text-green-400">
                        <CheckCircle2 />
                        <span>{message}</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400">
                        <AlertCircle />
                        <span>{message}</span>
                    </div>
                )}
            </Card>

            <div className="mt-8">
                <h3 className="font-bold mb-4">Sample Data Format</h3>
                <Card className="p-4 bg-black/20 font-mono text-[10px] text-slate-500">
                    GUID клиента,Пол клиента,Дата рождения,Сегмент клиента,Описание,Страна,Область,Населённый пункт,Улица,Дом<br />
                    fe44694a-10ed-f011-8406-0022481ba5f0,Мужской,1998-10-02,VIP,"Покупка акций в приложении...",Казахстан,Алматинская,Тургень,ул. Садовая,7
                </Card>
            </div>
        </div>
    );
}

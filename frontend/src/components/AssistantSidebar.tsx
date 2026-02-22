"use client";

import { useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    X,
    Send,
    Sparkles,
    Bot,
    User,
    BarChart3,
    PieChart as PieChartIcon,
    Activity,
    Loader2
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';
import { TicketCard } from './TicketCard';
import { useAssistant } from '@/context/AssistantContext';

const COLORS = [
    '#3489db', // primary blue
    '#26c6da', // cyan
    '#ab47bc', // purple
    '#ff7043', // orange
    '#fdd835', // yellow
    '#66bb6a', // green
    '#ec407a', // pink
    '#7e57c2', // deep purple
    '#29b6f6', // light blue
    '#9ccc65'  // light green
];

export function AssistantSidebar() {
    const { isOpen, setIsOpen } = useAssistant();
    const scrollRef = useRef<HTMLDivElement>(null);
    const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
        api: '/api/v1/assistant/chat',
        onError: (err) => {
            console.error('Chat stream error:', err);
        }
    });
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const renderChart = (toolName: string, result: any) => {
        if (!result || !Array.isArray(result)) return null;

        if (toolName === 'getTicketDistribution') {
            return (
                <div className="h-64 w-full bg-[#182833] rounded-xl p-4 my-4 border border-[#233642]">
                    <p className="text-[10px] font-black uppercase text-[#5b6f7c] mb-4 flex items-center gap-2">
                        <PieChartIcon size={12} /> Distribution Analysis
                    </p>
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                            <Pie
                                data={result}
                                cx="50%"
                                cy="50%"
                                innerRadius={42}
                                outerRadius={65}
                                paddingAngle={4}
                                cornerRadius={6}
                                stroke="#182833"
                                strokeWidth={2}
                                dataKey="value"
                                isAnimationActive={false}
                            >
                                {result.map((entry: any, index: number) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        style={{ filter: `drop-shadow(0px 0px 4px ${COLORS[index % COLORS.length]}40)` }}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111b21', border: '1px solid #233642', borderRadius: '12px', fontSize: '11px', boxShadow: '0 8px 16px rgba(0,0,0,0.4)' }}
                                itemStyle={{ color: '#fff', fontWeight: 600 }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto custom-scrollbar">
                        {result.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-1 min-w-fit">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-[9px] text-[#cbd3d9]">{item.name || 'Неизвестно'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (toolName === 'getManagerWorkload') {
            return (
                <div className="h-64 w-full bg-[#182833] rounded-xl p-4 my-4 border border-[#233642]">
                    <p className="text-[10px] font-black uppercase text-[#5b6f7c] mb-4 flex items-center gap-2">
                        <BarChart3 size={12} /> Workload Analysis
                    </p>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={result.map((r: any, i: number) => ({ ...r, numName: String(i + 1) }))} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#233642" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="numName"
                                type="category"
                                tick={{ fill: '#white', fontSize: 10, fontWeight: 'bold' }}
                                width={20}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#182833', border: '1px solid #233642', borderRadius: '8px', fontSize: '10px' }}
                                cursor={{ fill: '#ffffff05' }}
                            />
                            <Bar dataKey="value" fill="#0088FE" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        if (toolName === 'getSystemPerformance') {
            return (
                <div className="h-64 w-full bg-[#182833] rounded-xl p-4 my-4 border border-[#233642]">
                    <p className="text-[10px] font-black uppercase text-[#5b6f7c] mb-4 flex items-center gap-2">
                        <Activity size={12} /> Core Performance (ms)
                    </p>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={result}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#233642" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#5b6f7c', fontSize: 9 }} />
                            <YAxis tick={{ fill: '#5b6f7c', fontSize: 9 }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#182833', border: '1px solid #233642', borderRadius: '8px', fontSize: '10px' }}
                            />
                            <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        if (toolName === 'searchTickets') {
            return (
                <div className="flex flex-col gap-2 mt-4 mb-2">
                    <p className="text-[10px] font-black uppercase text-[#5b6f7c] mb-1 flex items-center gap-2">
                        <Sparkles size={12} className="text-primary" /> Найденные заявки
                    </p>
                    {result.length === 0 ? (
                        <p className="text-[11px] text-[#5b6f7c] italic">Ничего не найдено</p>
                    ) : result.map((t: any) => (
                        <div key={t.id} className="mb-2">
                            <TicketCard ticket={t} />
                        </div>
                    ))}
                </div>
            );
        }

        if (toolName === 'executeSQL') {
            // Check if result is an array of objects that could be a chart (e.g. { name, value } or 2 columns where one is numeric)
            if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object') {
                const keys = Object.keys(result[0]);
                const numericKey = keys.find(k => typeof result[0][k] === 'number' || (typeof result[0][k] === 'string' && !isNaN(Number(result[0][k]))));
                const labelKey = keys.find(k => k !== numericKey);

                if (numericKey && labelKey && result.length > 1) {
                    const chartData = result.map(item => ({
                        name: String(item[labelKey]),
                        value: Number(item[numericKey])
                    })).slice(0, 15);

                    return (
                        <div className="h-64 w-full bg-[#182833] rounded-xl p-4 my-4 border border-[#233642]">
                            <p className="text-[10px] font-black uppercase text-[#5b6f7c] mb-4 flex items-center gap-2">
                                <BarChart3 size={12} /> Аналитический график
                            </p>
                            <ResponsiveContainer width="100%" height="80%" key="sql-chart-container">
                                <BarChart data={chartData} key="sql-chart">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#233642" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fill: '#5b6f7c', fontSize: 8 }}
                                        interval={0}
                                        angle={-45}
                                        textAnchor="end"
                                        height={50}
                                    />
                                    <YAxis tick={{ fill: '#5b6f7c', fontSize: 8 }} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111b21', border: '1px solid #233642', borderRadius: '8px', fontSize: '10px' }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    );
                }

                // If it's a list of tickets (has id and description), we can render cards
                if (keys.includes('description') && (keys.includes('id') || keys.includes('clientGuid'))) {
                    return (
                        <div className="flex flex-col gap-2 mt-4">
                            {result.slice(0, 5).map((t: any, i: number) => (
                                <TicketCard key={t.id || i} ticket={t} />
                            ))}
                        </div>
                    );
                }

                // Default: render as a small table/list if it's too many columns
                return (
                    <div className="mt-4 overflow-x-auto bg-[#111b21] rounded-xl border border-[#233642] p-2">
                        <table className="w-full text-[10px] text-left border-collapse">
                            <thead>
                                <tr>
                                    {keys.map(k => <th key={k} className="p-1 border-b border-[#233642] text-[#5b6f7c] uppercase">{k}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {result.slice(0, 10).map((row, i) => (
                                    <tr key={i}>
                                        {keys.map(k => <td key={k} className="p-1 border-b border-[#233642]/50 text-[#cbd3d9]">{String(row[k])}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {result.length > 10 && <p className="text-[9px] text-[#5b6f7c] mt-1 italic text-center">Показано 10 из {result.length} строк</p>}
                    </div>
                );
            }
        }

        return null;
    };

    return (
        <>
            {/* Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 20 }}
                        className="fixed right-0 top-0 h-screen w-full md:w-[400px] bg-[#0d161d] border-l border-[#233642] z-50 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-[#233642] bg-[#111b21] shrink-0 flex items-center justify-between">
                            <h3 className="text-lg font-bold flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                    <Bot size={20} />
                                </div>
                                Intelligence Assistant
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-[#5b6f7c] hover:text-white transition-all bg-[#0d161d] p-2 rounded-xl border border-[#233642]"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                    <div className="w-16 h-16 rounded-3xl bg-[#182833] flex items-center justify-center border border-[#233642]">
                                        <MessageSquare size={32} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">Как я могу помочь?</p>
                                        <p className="text-[10px] uppercase font-black tracking-widest mt-1">Спроси меня о статистике тикетов</p>
                                    </div>
                                </div>
                            )}

                            {messages.map(m => (
                                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl p-4 ${m.role === 'user'
                                        ? 'bg-primary text-white ml-8 shadow-lg shadow-primary/10'
                                        : 'bg-[#182833] border border-[#233642] mr-8'
                                        }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {m.role === 'user' ? <User size={12} /> : <Bot size={12} className="text-primary" />}
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                                                {m.role === 'user' ? 'You' : 'Assistant'}
                                            </span>
                                        </div>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>

                                        {/* Tool Rendering */}
                                        {m.toolInvocations?.map((toolInvocation: any) => {
                                            const { toolName, toolCallId, state } = toolInvocation;
                                            if (state === 'result') {
                                                return (
                                                    <div key={toolCallId}>
                                                        {renderChart(toolName, toolInvocation.result)}
                                                    </div>
                                                );
                                            }
                                            if (state === 'call') {
                                                return (
                                                    <div key={toolCallId} className="flex items-center gap-2 text-[10px] text-[#5b6f7c] mt-2 italic">
                                                        <Loader2 size={10} className="animate-spin" />
                                                        Анализирую данные...
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-[#182833] border border-[#233642] rounded-2xl p-4 flex gap-1 items-center">
                                        <div className="w-1.5 h-1.5 bg-[#5b6f7c] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-[#5b6f7c] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-[#5b6f7c] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSubmit} className="p-4 border-t border-[#233642] bg-[#111b21]">
                            <div className="relative">
                                <input
                                    value={input}
                                    onChange={handleInputChange}
                                    placeholder="Спроси об аналитике..."
                                    className="w-full bg-[#182833] border border-[#233642] hover:border-[#384c5a] focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-3 pl-4 pr-12 text-sm transition-all outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="absolute right-2 top-1.5 p-2 rounded-xl bg-primary text-white disabled:opacity-50 disabled:bg-[#233642] transition-all hover:scale-105 active:scale-95"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                            <p className="text-[9px] text-center mt-3 text-[#5b6f7c] uppercase font-black tracking-widest">
                                AI может ошибаться. Проверяйте данные в Dashboard.
                            </p>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

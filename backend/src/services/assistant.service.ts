import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import prisma from '../config/database.js';

export class AssistantService {
    async chat(messages: any[]) {
        return streamText({
            model: openai('gpt-4o-mini'),
            system: `Ты — продвинутый AI-аналитик системы Freedom Broker Ticket Management.
Я — пользователь, который задает вопросы по данным (например, возраст клиентов, нагрузка менеджеров и т.д.).
Важно: Ты ИМЕЕШЬ доступ ко ВСТРОЕННОЙ БАЗЕ ДАННЫХ через инструмент 'executeSQL'. 
Твоя база данных работает на PostgreSQL и управляется Prisma. 

Схема базы данных:
- Таблица "Ticket": id, clientGuid, gender (поле содержит пол!), dateOfBirth (содержит возраст!), description, segment, country, oblast, city, ...
- Таблица "TicketAnalysis": id, ticketId, type, sentiment, priority, language, aiDuration, geoDuration, routingDuration, totalDuration...
- Таблица "Manager": id, fullName, position, activeTicketCount, officeId...
- Таблица "Office": id, name, address, latitude, longitude...

ПРАВИЛА ВЫБОРА ИНСТРУМЕНТА:
1. Если просят список клиентов/заявок -> ВСЕГДА 'searchTickets'. ОЧЕНЬ ВАЖНО: Если ты использовал инструмент 'searchTickets', НЕ описывай найденные заявки текстом в своем ответе. Фронтенд сам красиво отрендерит их карточками. Твой текстовый ответ должен быть максимально кратким, например: "Вот запрошенные заявки:". Не дублируй данные!
2. Если просят распределение по (тип, город, сегмент, тональность) -> 'getTicketDistribution'.
3. ДЛЯ ВСЕГО ОСТАЛЬНОГО (гендер, возраст, кастомные группировки, средние значения, сложные фильтры) -> ОБЯЗАТЕЛЬНО используй 'executeSQL'. 

Пример для гендера: "SELECT "gender" as name, count(*) as value FROM "Ticket" GROUP BY "gender""

ВСЕГДА оборачивай названия таблиц и полей в двойные кавычки, так как Prisma использует CamelCase (например: SELECT "dateOfBirth" FROM "Ticket").
Всегда давай дружелюбный текстовый ответ по-русски, объясняя данные, КРОМЕ случаев с 'searchTickets'.`,
            messages,
            maxSteps: 5,
            tools: {
                executeSQL: tool({
                    description: 'Выполнить произвольный SELECT SQL-запрос к PostgreSQL базе данных для получения любой аналитики и данных о тикетах, менеджерах, возрасте и т.д.',
                    parameters: z.object({
                        query: z.string().describe('PostgreSQL SELECT запрос. Обязательно используйте двойные кавычки для таблиц и колонок, например: SELECT "gender", count(*) FROM "Ticket" GROUP BY "gender"')
                    }),
                    execute: async ({ query }): Promise<any> => {
                        if (!query.trim().toUpperCase().startsWith('SELECT')) {
                            return { error: 'Разрешены только SELECT запросы' };
                        }
                        try {
                            const result = await prisma.$queryRawUnsafe(query);
                            // Convert BigInts to strings for JSON serialization
                            return JSON.parse(JSON.stringify(result, (key, value) =>
                                typeof value === 'bigint' ? value.toString() : value
                            ));
                        } catch (e: any) {
                            return { error: e.message || 'Ошибка SQL запроса' };
                        }
                    }
                }),
                getTicketDistribution: tool({
                    description: 'Получить распределение тикетов по категориям (тип, город, сегмент, тональность).',
                    parameters: z.object({
                        groupBy: z.enum(['type', 'city', 'segment', 'sentiment']),
                    }),
                    execute: async ({ groupBy }: { groupBy: string }): Promise<any> => {
                        if (groupBy === 'city') {
                            const stats = await prisma.ticket.groupBy({
                                by: ['city'],
                                _count: { _all: true },
                                orderBy: { _count: { city: 'desc' } }
                            });
                            return stats.map(s => ({ name: s.city || 'Неизвестно', value: s._count._all }));
                        }

                        if (groupBy === 'segment') {
                            const stats = await prisma.ticket.groupBy({
                                by: ['segment'],
                                _count: { _all: true }
                            });
                            return stats.map(s => ({ name: s.segment, value: s._count._all }));
                        }

                        if (groupBy === 'type') {
                            const stats = await prisma.ticketAnalysis.groupBy({
                                by: ['type'],
                                _count: { _all: true }
                            });
                            return stats.map(s => ({ name: s.type, value: s._count._all }));
                        }

                        if (groupBy === 'sentiment') {
                            const stats = await prisma.ticketAnalysis.groupBy({
                                by: ['sentiment'],
                                _count: { _all: true }
                            });
                            return stats.map(s => ({ name: s.sentiment, value: s._count._all }));
                        }

                        return [];
                    },
                }),
                getManagerWorkload: tool({
                    description: 'Получить данные о загруженности менеджеров (топ-10).',
                    parameters: z.object({}),
                    execute: async (): Promise<any> => {
                        const managers = await prisma.manager.findMany({
                            include: {
                                _count: { select: { tickets: true } }
                            },
                            orderBy: {
                                tickets: { _count: 'desc' }
                            },
                            take: 10
                        });
                        return managers.map(m => ({ name: m.fullName, value: m._count.tickets }));
                    }
                }),
                getSystemPerformance: tool({
                    description: 'Получить среднее время работы AI-ядра (обработка, геокодинг, роутинг).',
                    parameters: z.object({}),
                    execute: async (): Promise<any> => {
                        const stats = await prisma.ticketAnalysis.aggregate({
                            _avg: {
                                aiDuration: true,
                                geoDuration: true,
                                routingDuration: true,
                                totalDuration: true
                            }
                        });
                        return [
                            { name: 'AI Analysis', value: Math.round(stats._avg.aiDuration || 0) },
                            { name: 'Geocoding', value: Math.round(stats._avg.geoDuration || 0) },
                            { name: 'Routing', value: Math.round(stats._avg.routingDuration || 0) }
                        ];
                    }
                }),
                searchTickets: tool({
                    description: 'Найти тикеты (заявки) И выдать их пользователю в UI. Используй этот инструмент когда нужно показать пользователю список конкретных заявок.',
                    parameters: z.object({
                        sqlQuery: z.string().optional().describe('PostgreSQL SELECT запрос. ДОЛЖЕН возвращать только один столбец "id" из таблицы "Ticket". Пример: SELECT "id" FROM "Ticket" WHERE "city" = \'Астана\' LIMIT 5'),
                        ticketIds: z.array(z.string()).optional().describe('Массив конкретных ID тикетов. Если пользователь назвал или попросил показать конкретные ID (например, cmlxdck...), передай их сюда.')
                    }),
                    execute: async ({ sqlQuery, ticketIds }): Promise<any> => {
                        try {
                            let ids: string[] = [];

                            if (ticketIds && ticketIds.length > 0) {
                                ids = ticketIds;
                            } else if (sqlQuery) {
                                if (!sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
                                    return { error: 'Разрешены только SELECT запросы' };
                                }
                                const rawResult = await prisma.$queryRawUnsafe<{ id: string }[]>(sqlQuery);
                                ids = rawResult.map((r) => r.id);
                            }

                            if (ids.length === 0) return [];

                            const tickets = await prisma.ticket.findMany({
                                where: { id: { in: ids } },
                                include: { analysis: true, manager: true }
                            });

                            return tickets.map(t => ({
                                id: t.id,
                                description: t.description || 'Без текста',
                                city: t.city || 'Неизвестно',
                                segment: t.segment,
                                createdAt: t.createdAt.toISOString(),
                                manager: t.manager ? { id: t.manager.id, fullName: t.manager.fullName } : undefined,
                                analysis: t.analysis ? {
                                    type: t.analysis.type,
                                    priority: t.analysis.priority,
                                    summary: t.analysis.summary
                                } : undefined
                            }));
                        } catch (e: any) {
                            return { error: 'Ошибка при выполнении запроса: ' + e.message };
                        }
                    }
                })
            }
        });
    }
}

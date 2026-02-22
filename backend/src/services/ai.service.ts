import OpenAI from 'openai';
import { AppError } from '../utils/app-error.js';

export type AIAnalysisResult = {
    type: 'COMPLAINT' | 'DATA_CHANGE' | 'CONSULTATION' | 'CLAIM' | 'APP_MALFUNCTION' | 'FRAUD' | 'SPAM';
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    priority: number;
    language: 'KZ' | 'ENG' | 'RU';
    summary: string;
    normalizedLocation?: { city: string; region?: string; country: string };
};

const VALID_TYPES = ['COMPLAINT', 'DATA_CHANGE', 'CONSULTATION', 'CLAIM', 'APP_MALFUNCTION', 'FRAUD', 'SPAM'];
const VALID_SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
const VALID_LANGUAGES = ['KZ', 'ENG', 'RU'];

const SYSTEM_PROMPT = `You are a support ticket classifier for Freedom Broker (financial company).
Analyze the customer's message and classify it.

CRITICAL FRAUD DETECTION RULES:
- If the customer mentions "fraud", "scam", "stolen money", "unauthorized transaction", "suspicious broker", or doubts the legality of operations (e.g. "is this legal?", "victim of scammers?") -> ALWAYS type = FRAUD and priority 10.
- Even if it's just a question about being a victim, classify as FRAUD to ensure Lead Specialist review.

LOCATION NORMALIZATION:
- Extract the city and region from the message manually if possible, or use provided context to normalize it.
- Example: "Pavlodar in North Kazakhstan region" should be normalized to City: Pavlodar, Region: Pavlodar region (because Pavlodar is not in North Kazakhstan).

Classification rules:
- Types: COMPLAINT (general negative), DATA_CHANGE (passport, name), CONSULTATION (informational), CLAIM (demanding refund/compensation), APP_MALFUNCTION (bugs, SMS, app errors), FRAUD (suspicious activities), SPAM.
- Sentiments: POSITIVE, NEUTRAL, NEGATIVE.
- Priority: 1-10.

Respond ONLY with valid JSON: 
{ 
  "type": "TYPE", 
  "sentiment": "SENTIMENT", 
  "priority": 1-10, 
  "language": "KZ|ENG|RU", 
  "summary": "1-2 sentences in RU",
  "normalizedLocation": { "city": "Name", "region": "Name region", "country": "Kazakhstan" }
}`;

const VISION_SYSTEM_PROMPT = `You are a support ticket classifier for Freedom Broker.
Analyze image + text.

RULES:
- Suspicious transactions/scams -> FRAUD.
- App errors -> APP_MALFUNCTION.
- Documents -> DATA_CHANGE.

Respond ONLY with JSON: { "type": "TYPE", "sentiment": "SENTIMENT", "priority": 1-10, "language": "KZ|ENG|RU", "summary": "RU text", "normalizedLocation": { "city": "Name", "region": "Name region", "country": "Kazakhstan" } }`;

export class AIService {
    private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    /**
     * Анализ тикета с текстом (и опционально вложением).
     * gpt-4o-mini поддерживает vision — если attachment является URL изображения, отправляем его.
     */
    async analyzeTicket(description: string, segment: string, attachments?: string | null): Promise<AIAnalysisResult> {
        try {
            const hasAttachmentUrl = attachments && this.isImageUrl(attachments);

            console.log(`[AI] Analyzing (${segment}): "${description.slice(0, 60)}..."${hasAttachmentUrl ? ' + image' : ''}`);

            const segmentRules = `
Client Category: ${segment}
Priority Rules:
- FRAUD: priority 10.
- CLAIM (возмещение/претензия): priority 8-10.
- APP_MALFUNCTION (сбой): priority 6-8.
- DATA_CHANGE: priority 5-7.
- SPAM: priority 0.
- VIP special rule: IF segment is VIP, priority MUST BE at least 6.
- VIP + NEGATIVE rule: IF segment is VIP AND sentiment is NEGATIVE, priority MUST BE 8-10.
`;

            let messages: OpenAI.ChatCompletionMessageParam[];

            if (hasAttachmentUrl) {
                // Vision mode — отправляем текст + изображение
                messages = [
                    { role: 'system', content: VISION_SYSTEM_PROMPT + '\n' + segmentRules },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: description || 'Клиент отправил только изображение без текста.' },
                            { type: 'image_url', image_url: { url: attachments!, detail: 'low' } },
                        ],
                    },
                ];
            } else {
                // Text-only mode
                const userContent = attachments
                    ? `${description}\n\n[Вложение: ${attachments}]`
                    : description;

                messages = [
                    { role: 'system', content: SYSTEM_PROMPT + '\n' + segmentRules },
                    { role: 'user', content: userContent },
                ];
            }

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                response_format: hasAttachmentUrl ? undefined : { type: 'json_object' },
                temperature: 0.1,
            });

            const content = response.choices[0].message.content;
            if (!content) throw new AppError('AI: empty response');

            // Извлекаем JSON из ответа (на случай если модель обернула в markdown)
            const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(jsonStr) as AIAnalysisResult;

            // Валидация и нормализация ответа
            const validated = this.validateResult(parsed);

            console.log(`[AI] → ${validated.type} | ${validated.sentiment} | P${validated.priority} | ${validated.language}`);

            return validated;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown AI error';
            console.error('[AI] Error:', msg);
            throw new AppError(`AI Service failed: ${msg}`);
        }
    }

    /**
     * Валидация и нормализация AI ответа — гарантирует корректные значения.
     */
    private validateResult(raw: any): AIAnalysisResult {
        const type = VALID_TYPES.includes(raw.type) ? raw.type : 'CONSULTATION';
        const sentiment = VALID_SENTIMENTS.includes(raw.sentiment) ? raw.sentiment : 'NEUTRAL';
        const language = VALID_LANGUAGES.includes(raw.language) ? raw.language : 'RU';
        const priority = Math.min(10, Math.max(1, Number(raw.priority) || 5));
        const summary = typeof raw.summary === 'string' ? raw.summary : 'Результат анализа.';
        const normalizedLocation = raw.normalizedLocation && typeof raw.normalizedLocation === 'object' ? {
            city: String(raw.normalizedLocation.city || ''),
            region: String(raw.normalizedLocation.region || ''),
            country: String(raw.normalizedLocation.country || 'Казахстан')
        } : undefined;

        return { type, sentiment, priority, language, summary, normalizedLocation };
    }

    /**
     * Проверяет, является ли строка URL изображения.
     */
    private isImageUrl(str: string): boolean {
        try {
            const lower = str.toLowerCase().trim();
            if (lower.startsWith('http://') || lower.startsWith('https://')) {
                return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(lower) ||
                    lower.includes('image') ||
                    lower.includes('screenshot') ||
                    lower.includes('photo');
            }
            return false;
        } catch {
            return false;
        }
    }
}

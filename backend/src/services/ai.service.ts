import OpenAI from 'openai';
import { AppError } from '../utils/app-error.js';

export type AIAnalysisResult = {
    type: 'Жалоба' | 'Смена_данных' | 'Консультация' | 'Претензия' | 'Неработоспособность_приложения' | 'Мошеннические_действия' | 'Спам';
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    priority: number;
    language: 'KZ' | 'ENG' | 'RU';
    summary: string;
    normalizedLocation?: { city: string; region?: string; country: string };
};

const VALID_TYPES = ['Жалоба', 'Смена_данных', 'Консультация', 'Претензия', 'Неработоспособность_приложения', 'Мошеннические_действия', 'Спам'];
const VALID_SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
const VALID_LANGUAGES = ['KZ', 'ENG', 'RU'];

const SYSTEM_PROMPT = `You are a support ticket classifier for Freedom Broker (financial company).
Analyze the customer's message and classify it.

CRITICAL FRAUD DETECTION RULES:
- If the customer mentions "fraud", "scam", "stolen money", "unauthorized transaction", "suspicious broker", or doubts the legality of operations (e.g. "is this legal?", "victim of scammers?") -> ALWAYS type = Мошеннические_действия and priority 10.
- Even if it's just a question about being a victim, classify as Мошеннические_действия to ensure Lead Specialist review.

LOCATION NORMALIZATION:
- Extract the city and region from the message manually if possible, or use provided context to normalize it.

Classification rules:
- Types: 
  - Жалоба (общий негатив)
  - Смена_данных (смена паспорта, ФИО, телефона)
  - Консультация (вопросы, информация)
  - Претензия (требование возврата, компенсации)
  - Неработоспособность_приложения (баги, СМС, ошибки в приложении)
  - Мошеннические_действия (подозрительная активность)
  - Спам (реклама)
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
- Suspicious transactions/scams -> Мошеннические_действия.
- App errors -> Неработоспособность_приложения.
- Documents -> Смена_данных.

Respond ONLY with JSON: { "type": "TYPE", "sentiment": "SENTIMENT", "priority": 1-10, "language": "KZ|ENG|RU", "summary": "RU text", "normalizedLocation": { "city": "Name", "region": "Name region", "country": "Kazakhstan" } }`;

export class AIService {
    private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    /**
     * Анализ тикета с текстом (и опционально вложением).
     */
    async analyzeTicket(description: string, segment: string, attachments?: string | null): Promise<AIAnalysisResult> {
        try {
            const hasAttachmentUrl = attachments && this.isImageUrl(attachments);

            console.log(`[AI] Analyzing (${segment}): "${description.slice(0, 60)}..."${hasAttachmentUrl ? ' + image' : ''}`);

            const segmentRules = `
Client Category: ${segment}
Priority Rules:
- Мошеннические_действия: priority 10.
- Претензия (возмещение/претензия): priority 8-10.
- Неработоспособность_приложения (сбой): priority 6-8.
- Смена_данных: priority 5-7.
- Спам: priority 0.
- VIP special rule: IF segment is VIP, priority MUST BE at least 6.
- VIP + NEGATIVE rule: IF segment is VIP AND sentiment is NEGATIVE, priority MUST BE 8-10.
`;

            let messages: OpenAI.ChatCompletionMessageParam[];

            if (hasAttachmentUrl) {
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

            const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            const validated = this.validateResult(parsed);

            console.log(`[AI] → ${validated.type} | ${validated.sentiment} | P${validated.priority} | ${validated.language}`);

            return validated;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown AI error';
            console.error('[AI] Error:', msg);
            throw new AppError(`AI Service failed: ${msg}`);
        }
    }

    private validateResult(raw: any): AIAnalysisResult {
        const type = VALID_TYPES.includes(raw.type) ? raw.type as any : 'Консультация';
        const sentiment = VALID_SENTIMENTS.includes(raw.sentiment) ? raw.sentiment as any : 'NEUTRAL';
        const language = VALID_LANGUAGES.includes(raw.language) ? raw.language as any : 'RU';
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

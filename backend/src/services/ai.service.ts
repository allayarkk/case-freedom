import OpenAI from 'openai';
import { AppError } from '../utils/app-error.js';

export type AIAnalysisResult = {
    type: 'COMPLAINT' | 'DATA_CHANGE' | 'CONSULTATION' | 'CLAIM' | 'APP_MALFUNCTION' | 'FRAUD' | 'SPAM';
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    priority: number;
    language: 'KZ' | 'ENG' | 'RU';
    summary: string;
};

const VALID_TYPES = ['COMPLAINT', 'DATA_CHANGE', 'CONSULTATION', 'CLAIM', 'APP_MALFUNCTION', 'FRAUD', 'SPAM'];
const VALID_SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
const VALID_LANGUAGES = ['KZ', 'ENG', 'RU'];

const SYSTEM_PROMPT = `You are a support ticket classifier for Freedom Broker (financial company).
Analyze the customer's message and classify it.

Classification rules:
- Types: COMPLAINT (негатив без конкретных требований), DATA_CHANGE (смена данных, паспорт, ФИО), CONSULTATION (вопрос, запрос информации), CLAIM (претензия с требованием возмещения/компенсации), APP_MALFUNCTION (ошибка, сбой, не работает приложение, не приходит SMS), FRAUD (мошенничество, несанкционированный доступ, подозрительные операции), SPAM (нерелевантное).
- Sentiments: POSITIVE (благодарность, спасибо, доволен), NEUTRAL (нейтральный, информативный тон), NEGATIVE (недоволен, злится, жалуется).
- CRITICAL: Type and sentiment are INDEPENDENT. A message like "SMS не приходит" is APP_MALFUNCTION even if tone is neutral. Determine type by WHAT happened, sentiment by HOW the client feels.
- Priority 1-10: Consider type severity (FRAUD=10, CLAIM≥7, APP_MALFUNCTION≥6), sentiment (NEGATIVE raises priority), and urgency.
- Language: detect if text is in Kazakh (KZ), English (ENG), or Russian (RU).

Respond ONLY with valid JSON: { "type": "TYPE", "sentiment": "SENTIMENT", "priority": 1-10, "language": "KZ|ENG|RU", "summary": "1-2 sentences in Russian" }`;

const VISION_SYSTEM_PROMPT = `You are a support ticket classifier for Freedom Broker (financial company).
The customer has sent an attachment (image). Analyze the image content along with any text description.

Classification rules:
- If the image shows an error (error, data error, order error, отказ) → type = APP_MALFUNCTION
- If the image shows suspicious transactions → type = FRAUD
- If the image shows personal documents (passport, ID) → type = DATA_CHANGE
- Types: COMPLAINT, DATA_CHANGE, CONSULTATION, CLAIM, APP_MALFUNCTION, FRAUD, SPAM
- Sentiments: POSITIVE, NEUTRAL, NEGATIVE
- Priority 1-10: Consider type severity (FRAUD=10, CLAIM≥7, APP_MALFUNCTION≥6).
- Language: detect from text (KZ, ENG, RU).

Respond ONLY with valid JSON: { "type": "TYPE", "sentiment": "SENTIMENT", "priority": 1-10, "language": "KZ|ENG|RU", "summary": "1-2 sentences in Russian describing what you see" }`;

export class AIService {
    private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    /**
     * Анализ тикета с текстом (и опционально вложением).
     * gpt-4o-mini поддерживает vision — если attachment является URL изображения, отправляем его.
     */
    async analyzeTicket(description: string, attachments?: string | null): Promise<AIAnalysisResult> {
        try {
            const hasAttachmentUrl = attachments && this.isImageUrl(attachments);

            console.log(`[AI] Analyzing: "${description.slice(0, 60)}..."${hasAttachmentUrl ? ' + image' : ''}`);

            let messages: OpenAI.ChatCompletionMessageParam[];

            if (hasAttachmentUrl) {
                // Vision mode — отправляем текст + изображение
                messages = [
                    { role: 'system', content: VISION_SYSTEM_PROMPT },
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
                    { role: 'system', content: SYSTEM_PROMPT },
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

        return { type, sentiment, priority, language, summary };
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

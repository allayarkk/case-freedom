import OpenAI from 'openai';
import { AppError } from '../utils/app-error.js';

export type AIAnalysisResult = {
    type: 'Жалоба' | 'Смена_данных' | 'Консультация' | 'Претензия' | 'Неработоспособность_приложения' | 'Мошеннические_действия' | 'Спам' | 'НЕ_РАЗОБРАНО';
    sentiment: 'Позитивный' | 'Нейтральный' | 'Негативный';
    priority: number;
    language: 'KZ' | 'ENG' | 'RU';
    summary: string;
    normalizedLocation?: { city: string; region?: string; country: string };
};

const VALID_TYPES = ['Жалоба', 'Смена_данных', 'Консультация', 'Претензия', 'Неработоспособность_приложения', 'Мошеннические_действия', 'Спам', 'НЕ_РАЗОБРАНО'];
const VALID_SENTIMENTS = ['Позитивный', 'Нейтральный', 'Негативный'];

const SYSTEM_PROMPT = `Ты — экспертный классификатор Freedom Broker. Твоя задача — полный анализ заявки.

1. ТИП ОБРАЩЕНИЯ: Жалоба, Смена_данных, Консультация (только информационные вопросы), Претензия (требования/деньги), Неработоспособность_приложения, Мошеннические_действия, Спам.
2. ТОНАЛЬНОСТЬ: Позитивный, Нейтральный, Негативный.
3. ПРИОРИТЕТНОСТЬ (Шкала 1-10):
   - 10: Мошенничество, угрозы, критические баги оплаты.
   - 8-9: Претензии по деньгам, негатив от VIP-клиентов.
   - 5-7: Смена данных, технические ошибки в приложении.
   - 1-4: Обычные консультации, благодарности, спам.
4. ЯЗЫК: KZ, ENG, RU. По умолчанию RU.
5. SUMMARY: Выжимка сути обращения + рекомендация для менеджера. Пиши SUMMARY СТРОГО на языке клиента (если пишет на KZ — отвечай на KZ). 1-3 предложения.
6. ГЕО-НОРМАЛИЗАЦИЯ: Извлеки Город, Область, Страну для маршрутизации.

Отвечай ТОЛЬКО JSON:
{ 
  "type": "ТИП", 
  "sentiment": "Позитивный|Нейтральный|Негативный", 
  "priority": 1-10, 
  "language": "KZ|ENG|RU", 
  "summary": "Выжимка + Рекомендация",
  "normalizedLocation": { "city": "Город", "region": "Область", "country": "Страна" }
}`;

const VISION_SYSTEM_PROMPT = `Ты — аналитик Freedom Broker. Оценивай изображение по тем же правилам, что и текст.
- Скриншоты ошибок -> Неработоспособность_приложения (Priority 6-8).
- Удостоверения -> Смена_данных (Priority 5).
- Чересчур подозрительные скрины -> Мошеннические_действия (Priority 10).
Ответ строго JSON.`;

export class AIService {
    private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    async analyzeTicket(description: string, segment: string, attachments?: string | null): Promise<AIAnalysisResult> {
        try {
            const isImage = !!attachments && (attachments.startsWith('data:image/') || (attachments.length > 100 && !attachments.includes(' ')));

            const segmentRules = `Доп. правило для VIP: Если сегмент VIP, приоритет не может быть ниже 6.`;

            const imageUrl = isImage && !attachments!.startsWith('data:') ? `data:image/jpeg;base64,${attachments}` : attachments;

            const messages: OpenAI.ChatCompletionMessageParam[] = isImage
                ? [
                    { role: 'system', content: `${VISION_SYSTEM_PROMPT}\n${segmentRules}` },
                    { role: 'user', content: [{ type: 'text', text: description || 'Скриншот' }, { type: 'image_url', image_url: { url: imageUrl!, detail: 'low' } }] }
                ]
                : [
                    { role: 'system', content: `${SYSTEM_PROMPT}\n${segmentRules}` },
                    { role: 'user', content: attachments ? `${description}\n[Вложение: ${attachments}]` : description }
                ];

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                response_format: isImage ? undefined : { type: 'json_object' },
                temperature: 0,
            });

            const content = response.choices[0].message.content || '{}';
            const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());

            return {
                type: VALID_TYPES.includes(parsed.type) ? parsed.type : 'НЕ_РАЗОБРАНО',
                sentiment: VALID_SENTIMENTS.includes(parsed.sentiment) ? parsed.sentiment : 'Нейтральный',
                priority: Number(parsed.priority) || 0,
                language: ['KZ', 'ENG', 'RU'].includes(parsed.language) ? parsed.language : parsed.language,
                summary: parsed.summary || 'Требуется ручной анализ',
                normalizedLocation: parsed.normalizedLocation
            };
        } catch (error) {
            throw new AppError('AI Service Error');
        }
    }
}

import OpenAI from 'openai';
import { AppError } from '../utils/app-error.js';

export type AIAnalysisResult = {
    type: 'COMPLAINT' | 'DATA_CHANGE' | 'CONSULTATION' | 'CLAIM' | 'APP_MALFUNCTION' | 'FRAUD' | 'SPAM';
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    priority: number;
    language: 'KZ' | 'ENG' | 'RU';
    summary: string;
};

const SYSTEM_PROMPT = `You are a support ticket classifier for Freedom Broker. Analyze the ticket and respond with a JSON object.
Types: COMPLAINT, DATA_CHANGE, CONSULTATION, CLAIM, APP_MALFUNCTION, FRAUD, SPAM.
Respond ONLY with: { "type": "TYPE", "sentiment": "POSITIVE|NEUTRAL|NEGATIVE", "priority": 1-10, "language": "KZ|ENG|RU", "summary": "1-2 sentences" }`;

export class AIService {
    private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    async analyzeTicket(description: string): Promise<AIAnalysisResult> {
        try {
            console.log(`[AI] Analyzing: "${description.slice(0, 50)}..."`);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: description },
                ],
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0].message.content;
            if (!content) throw new AppError('AI: empty response');

            const parsed = JSON.parse(content) as AIAnalysisResult;
            console.log(`[AI] → ${parsed.type} | P${parsed.priority} | ${parsed.language}`);

            return {
                type: parsed.type,
                sentiment: parsed.sentiment,
                priority: Math.min(10, Math.max(1, Number(parsed.priority))),
                language: parsed.language ?? 'RU',
                summary: parsed.summary,
            };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown AI error';
            console.error('[AI] Error:', msg);
            throw new AppError(`AI Service failed: ${msg}`);
        }
    }
}

import OpenAI from 'openai';
import { AppError } from '../utils/app-error.js';

export type AIAnalysisResult = {
    type: 'COMPLAINT' | 'DATA_CHANGE' | 'CONSULTATION' | 'CLAIM' | 'APP_MALFUNCTION' | 'FRAUD' | 'SPAM';
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    priority: number;
    language: 'KZ' | 'ENG' | 'RU';
    summary: string;
};

export class AIService {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    async analyzeTicket(description: string): Promise<AIAnalysisResult> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a support ticket classifier. Analyze the ticket and respond with a JSON object containing:
- type: one of COMPLAINT, DATA_CHANGE, CONSULTATION, CLAIM, APP_MALFUNCTION, FRAUD, SPAM
- sentiment: one of POSITIVE, NEUTRAL, NEGATIVE
- priority: integer 1-10 (10 = most urgent)
- language: one of KZ, ENG, RU (default RU if unclear)
- summary: 1-2 sentences summarizing the issue + a short recommendation for the manager

Respond ONLY with valid JSON, no additional text.`,
                    },
                    {
                        role: 'user',
                        content: description,
                    },
                ],
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0].message.content;
            if (!content) throw new AppError('AI analysis failed: empty response');

            const parsed = JSON.parse(content) as AIAnalysisResult;
            return {
                type: parsed.type,
                sentiment: parsed.sentiment,
                priority: Math.min(10, Math.max(1, Number(parsed.priority))),
                language: parsed.language ?? 'RU',
                summary: parsed.summary,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown AI error';
            console.error('AIService error:', message);
            throw new AppError(`AI Service failed: ${message}`);
        }
    }
}

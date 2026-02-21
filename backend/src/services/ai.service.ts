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
            console.log(`[AI] Analyzing description: "${description.slice(0, 50)}..."`);
            console.log(`[AI] Using model: gpt-4o-mini`);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a support ticket classifier for Freedom Broker. Analyze the ticket and respond with a JSON object.
Types:
- COMPLAINT: general dissatisfaction
- DATA_CHANGE: requests to change phone, ID, name, etc.
- CONSULTATION: questions about products
- CLAIM: financial/legal claims
- APP_MALFUNCTION: bugs in mobile app
- FRAUD: suspicious activity reports
- SPAM: irrelevant content

Respond ONLY with this JSON structure:
{
  "type": "TYPE",
  "sentiment": "POSITIVE|NEUTRAL|NEGATIVE",
  "priority": 1-10,
  "language": "KZ|ENG|RU",
  "summary": "1-2 sentences summarizing the issue"
}`,
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
            console.log(`[AI] Result for ticket: ${parsed.type} | P${parsed.priority} | ${parsed.language}`);

            return {
                type: parsed.type,
                sentiment: parsed.sentiment,
                priority: Math.min(10, Math.max(1, Number(parsed.priority))),
                language: parsed.language ?? 'RU',
                summary: parsed.summary,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown AI error';
            console.error('[AI] Service error:', message);
            throw new AppError(`AI Service failed: ${message}`);
        }
    }
}

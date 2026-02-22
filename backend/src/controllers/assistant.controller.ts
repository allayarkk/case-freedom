import { Request, Response, NextFunction } from 'express';
import { AssistantService } from '../services/assistant.service.js';

export class AssistantController {
    constructor(private assistantService: AssistantService) { }

    chat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { messages } = req.body;
            const result = await this.assistantService.chat(messages);
            result.pipeDataStreamToResponse(res);
        } catch (error) {
            next(error);
        }
    };
}

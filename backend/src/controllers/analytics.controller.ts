import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';
import { successResponse } from '../utils/api-response.js';

export class AnalyticsController {
    constructor(private svc: AnalyticsService) { }

    getKanbanStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.json(successResponse(await this.svc.getKanbanStats(req.query.officeId as string)));
        } catch (e) { next(e); }
    };

    getWorkload = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.json(successResponse(await this.svc.getWorkload()));
        } catch (e) { next(e); }
    };
}

import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';
import { successResponse } from '../utils/api-response.js';

export class AnalyticsController {
    constructor(private analyticsService: AnalyticsService) { }

    getKanbanStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const officeId = req.query.officeId as string | undefined;
            const stats = await this.analyticsService.getKanbanStats(officeId);
            res.json(successResponse(stats));
        } catch (error) {
            next(error);
        }
    };

    getWorkload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const stats = await this.analyticsService.getWorkload();
            res.json(successResponse(stats));
        } catch (error) {
            next(error);
        }
    };
}

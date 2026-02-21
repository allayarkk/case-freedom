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

    getImportHistory = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.json(successResponse(await this.svc.getImportHistory()));
        } catch (e) { next(e); }
    };

    getImportSessionDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const detail = await this.svc.getImportSessionDetail(String(req.params.id));
            if (!detail) {
                res.status(404).json({ success: false, error: { message: 'Session not found' } });
                return;
            }
            res.json(successResponse(detail));
        } catch (e) { next(e); }
    };

    createImportSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { totalTickets, name } = req.body;
            res.status(201).json(successResponse(await this.svc.createImportSession(totalTickets, name)));
        } catch (e) { next(e); }
    };

    updateImportSessionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.json(successResponse(await this.svc.updateImportSessionStatus(String(req.params.id), req.body.status)));
        } catch (e) { next(e); }
    };
}

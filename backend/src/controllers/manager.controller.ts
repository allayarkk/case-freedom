import { Request, Response, NextFunction } from 'express';
import { ManagerRepository } from '../repositories/manager.repository.js';
import { successResponse } from '../utils/api-response.js';

export class ManagerController {
    constructor(private repo: ManagerRepository) { }

    getManagers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.json(successResponse(await this.repo.findMany({ officeId: req.query.officeId as string })));
        } catch (e) { next(e); }
    };

    getManagerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const manager = await this.repo.findById(req.params.id);
            if (!manager) { res.status(404).json({ success: false, error: { message: 'Manager not found' } }); return; }
            res.json(successResponse(manager));
        } catch (e) { next(e); }
    };
}

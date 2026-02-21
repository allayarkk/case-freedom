import { Request, Response, NextFunction } from 'express';
import { ManagerRepository } from '../repositories/manager.repository.js';
import { successResponse } from '../utils/api-response.js';

export class ManagerController {
    constructor(private managerRepo: ManagerRepository) { }

    getManagers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const officeId = req.query.officeId as string | undefined;
            const managers = await this.managerRepo.findMany({ officeId });
            res.json(successResponse(managers));
        } catch (error) {
            next(error);
        }
    };

    getManagerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const manager = await this.managerRepo.findById(String(req.params.id));
            if (!manager) {
                res.status(404).json({ success: false, error: { message: 'Manager not found' } });
                return;
            }
            res.json(successResponse(manager));
        } catch (error) {
            next(error);
        }
    };
}

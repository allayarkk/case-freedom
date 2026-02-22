import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/api-response.js';
import prisma from '../config/database.js';

export class ManagerController {
    getManagers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const officeId = req.query.officeId as string;
            const managers = await prisma.manager.findMany({
                where: officeId ? { officeId } : {},
                include: { office: true, _count: { select: { tickets: true } } },
            });
            res.json(successResponse(managers));
        } catch (e) { next(e); }
    };

    getManagerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const manager = await prisma.manager.findUnique({
                where: { id: req.params.id as string },
                include: {
                    office: true,
                    tickets: {
                        include: { analysis: true, manager: true },
                        orderBy: { createdAt: 'desc' }
                    }
                },
            });
            if (!manager) { res.status(404).json({ success: false, error: { message: 'Manager not found' } }); return; }
            res.json(successResponse(manager));
        } catch (e) { next(e); }
    };
}

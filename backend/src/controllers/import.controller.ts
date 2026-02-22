import { Request, Response, NextFunction } from 'express';
import { OfficeImportService } from '../services/office-import.service.js';
import { ManagerImportService } from '../services/manager-import.service.js';
import { successResponse } from '../utils/api-response.js';
import { parseCSV } from '../utils/csv-parser.js';
import prisma from '../config/database.js';

export class ImportController {
    private officeImport = new OfficeImportService();
    private managerImport = new ManagerImportService();

    importOffices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const csv = req.body.csv as string;
            if (!csv?.trim()) { res.status(400).json({ success: false, error: { message: 'Missing csv' } }); return; }
            res.json(successResponse(await this.officeImport.importFromCSV(parseCSV(csv) as Record<string, string>[])));
        } catch (e) { next(e); }
    };

    importManagers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const csv = req.body.csv as string;
            if (!csv?.trim()) { res.status(400).json({ success: false, error: { message: 'Missing csv' } }); return; }
            res.json(successResponse(await this.managerImport.importFromCSV(parseCSV(csv) as Record<string, string>[])));
        } catch (e) { next(e); }
    };

    getOffices = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const offices = await prisma.office.findMany({
                include: { _count: { select: { managers: true, tickets: true } } },
                orderBy: { name: 'asc' },
            });
            res.json(successResponse(offices));
        }
        catch (e) { next(e); }
    };
}

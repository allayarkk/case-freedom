import { Request, Response, NextFunction } from 'express';
import { OfficeRepository } from '../repositories/office.repository.js';
import { OfficeImportService } from '../services/office-import.service.js';
import { ManagerImportService } from '../services/manager-import.service.js';
import { successResponse } from '../utils/api-response.js';
import { parseCSV } from '../utils/csv-parser.js';

export class ImportController {
    private officeRepo = new OfficeRepository();
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
        try { res.json(successResponse(await this.officeRepo.findAll())); }
        catch (e) { next(e); }
    };
}

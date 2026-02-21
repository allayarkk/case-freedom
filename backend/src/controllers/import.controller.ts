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
            if (!csv?.trim()) {
                res.status(400).json({ success: false, error: { message: 'Missing csv field' } });
                return;
            }
            const rows = parseCSV(csv) as Record<string, string>[];
            const result = await this.officeImport.importFromCSV(rows);
            res.json(successResponse(result));
        } catch (err) {
            next(err);
        }
    };

    importManagers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const csv = req.body.csv as string;
            if (!csv?.trim()) {
                res.status(400).json({ success: false, error: { message: 'Missing csv field' } });
                return;
            }
            const rows = parseCSV(csv) as Record<string, string>[];
            const result = await this.managerImport.importFromCSV(rows);
            res.json(successResponse(result));
        } catch (err) {
            next(err);
        }
    };

    getOffices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const offices = await this.officeRepo.findAll();
            res.json(successResponse(offices));
        } catch (err) {
            next(err);
        }
    };
}

import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service.js';
import { successResponse } from '../utils/api-response.js';
import { parseCSV } from '../utils/csv-parser.js';

interface AuthUser {
    id: string;
    role: 'ADMIN' | 'OFFICE_ADMIN' | 'MANAGER';
    officeId?: string;
}

export class TicketController {
    constructor(private ticketService: TicketService) { }

    importTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const csvContent = req.body.csv as string;
            if (!csvContent) {
                res.status(400).json({ success: false, error: { message: 'Missing csv field in request body' } });
                return;
            }

            console.log('Starting CSV import batch...');
            const data = parseCSV(csvContent) as Record<string, string>[];
            const result = await this.ticketService.importTickets(data);

            console.log(`Import finished. Processed: ${result.processed}, Failed: ${result.failed}`);
            res.json(successResponse(result));
        } catch (error) {
            console.error('Import Error in Controller:', error);
            next(error);
        }
    };

    getTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { page = '1', limit = '20', managerId, officeId, segment } = req.query;
            const user: AuthUser = (req as any).user ?? { id: 'admin', role: 'ADMIN' as const };

            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            const result = await this.ticketService.getTickets(
                {
                    managerId: managerId as string | undefined,
                    officeId: officeId as string | undefined,
                    segment: segment as string | undefined,
                },
                { skip, take },
                user
            );

            res.json(
                successResponse(result.tickets, {
                    page: Number(page),
                    limit: Number(limit),
                    total: result.total,
                })
            );
        } catch (error) {
            next(error);
        }
    };

    getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const id = String(req.params.id);
            const ticket = await this.ticketService.getTicketById(id);
            if (!ticket) {
                res.status(404).json({ success: false, error: { message: 'Ticket not found' } });
                return;
            }
            res.json(successResponse(ticket));
        } catch (error) {
            next(error);
        }
    };
}

import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service.js';
import { successResponse } from '../utils/api-response.js';
import { parseCSV } from '../utils/csv-parser.js';

export class TicketController {
    constructor(private ticketService: TicketService) { }

    importTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const csv = req.body.csv as string;
            if (!csv) { res.status(400).json({ success: false, error: { message: 'Missing csv field' } }); return; }

            const data = parseCSV(csv) as Record<string, string>[];
            const result = await this.ticketService.importTickets(data);
            console.log(`[Import] Done: ${result.processed} ok, ${result.failed} failed`);
            res.json(successResponse(result));
        } catch (error) { next(error); }
    };

    getTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { page = '1', limit = '20', managerId, officeId, segment } = req.query;
            const user = (req as any).user ?? { id: 'admin', role: 'ADMIN' as const };
            const skip = (Number(page) - 1) * Number(limit);

            const result = await this.ticketService.getTickets(
                { managerId: managerId as string, officeId: officeId as string, segment: segment as string },
                { skip, take: Number(limit) },
                user
            );

            res.json(successResponse(result.tickets, { page: Number(page), limit: Number(limit), total: result.total }));
        } catch (error) { next(error); }
    };

    getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const ticket = await this.ticketService.getTicketById(String(req.params.id));
            if (!ticket) { res.status(404).json({ success: false, error: { message: 'Ticket not found' } }); return; }
            res.json(successResponse(ticket));
        } catch (error) { next(error); }
    };
}

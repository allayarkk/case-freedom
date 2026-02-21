import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticket.service.js';
import { successResponse } from '../utils/api-response.js';
import { parseCSV } from '../utils/csv-parser.js';

export class TicketController {
    constructor(private ticketService: TicketService) { }

    /** POST /tickets/import — Batch import из CSV */
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

    /** POST /tickets — Создание одного тикета */
    createTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const {
                clientGuid, gender, dateOfBirth, description,
                attachments, segment, country, oblast, city, street, houseNumber
            } = req.body;

            if (!clientGuid) {
                res.status(400).json({ success: false, error: { message: 'clientGuid is required' } });
                return;
            }

            const result = await this.ticketService.processSingleTicket({
                clientGuid,
                gender: gender || '',
                dateOfBirth: dateOfBirth || '',
                description: description || '',
                attachments: attachments || null,
                segment: segment || 'MASS',
                country: country || 'Казахстан',
                oblast: oblast || '',
                city: city || '',
                street: street || '',
                houseNumber: houseNumber || '',
            });

            res.status(201).json(successResponse(result));
        } catch (error) { next(error); }
    };

    /** GET /tickets — Список тикетов с фильтрами */
    getTickets = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { page = '1', limit = '20', managerId, officeId, segment } = req.query;
            const skip = (Number(page) - 1) * Number(limit);
            const result = await this.ticketService.getTickets(
                { managerId: managerId as string, officeId: officeId as string, segment: segment as string },
                { skip, take: Number(limit) }
            );

            res.json(successResponse(result.tickets, { page: Number(page), limit: Number(limit), total: result.total }));
        } catch (error) { next(error); }
    };

    /** GET /tickets/:id — Один тикет с полным контекстом */
    getTicketById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const ticket = await this.ticketService.getTicketById(String(req.params.id));
            if (!ticket) { res.status(404).json({ success: false, error: { message: 'Ticket not found' } }); return; }
            res.json(successResponse(ticket));
        } catch (error) { next(error); }
    };

    /** PATCH /tickets/:id/close — Закрытие тикета (activeTicketCount -1) */
    closeTicket = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const ticket = await this.ticketService.closeTicket(String(req.params.id));
            res.json(successResponse(ticket));
        } catch (error) { next(error); }
    };
}

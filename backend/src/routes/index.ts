import { Router } from 'express';
import { DependencyContainer } from '../utils/dependency-container.js';

const router = Router();
const container = DependencyContainer.getInstance();

// Health
router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

// Tickets
router.get('/tickets', container.ticketController.getTickets);
router.get('/tickets/:id', container.ticketController.getTicketById);
router.post('/tickets/import', container.ticketController.importTickets);

// Managers
router.get('/managers', container.managerController.getManagers);
router.get('/managers/:id', container.managerController.getManagerById);

// Analytics
router.get('/analytics/kanban', container.analyticsController.getKanbanStats);
router.get('/analytics/workload', container.analyticsController.getWorkload);

export default router;

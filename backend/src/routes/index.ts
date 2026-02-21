import { Router } from 'express';
import { DependencyContainer } from '../utils/dependency-container.js';
import { ImportController } from '../controllers/import.controller.js';

const router = Router();
const c = DependencyContainer.getInstance();
const importCtrl = new ImportController();

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

// Tickets
router.get('/tickets', c.ticketController.getTickets);
router.get('/tickets/:id', c.ticketController.getTicketById);
router.post('/tickets', c.ticketController.createTicket);           // Single ticket
router.post('/tickets/import', c.ticketController.importTickets);   // Batch CSV
router.patch('/tickets/:id/close', c.ticketController.closeTicket); // Close ticket

// Managers
router.get('/managers', c.managerController.getManagers);
router.get('/managers/:id', c.managerController.getManagerById);

// Offices
router.get('/offices', importCtrl.getOffices);

// Import (CSV)
router.post('/import/offices', importCtrl.importOffices);
router.post('/import/managers', importCtrl.importManagers);

// Analytics & History
router.get('/analytics/kanban', c.analyticsController.getKanbanStats);
router.get('/analytics/workload', c.analyticsController.getWorkload);
router.get('/analytics/imports', c.analyticsController.getImportHistory);
router.get('/analytics/imports/:id', c.analyticsController.getImportSessionDetail);
router.post('/analytics/imports', c.analyticsController.createImportSession);
router.patch('/analytics/imports/:id', c.analyticsController.updateImportSessionStatus);

export default router;

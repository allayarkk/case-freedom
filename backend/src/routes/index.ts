import { Router } from 'express';
import { DependencyContainer } from '../utils/dependency-container.js';
import { ImportController } from '../controllers/import.controller.js';

const router = Router();
const container = DependencyContainer.getInstance();
const importCtrl = new ImportController();

// Health
router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

// ── Tickets ─────────────────────────────────────────────────────
router.get('/tickets', container.ticketController.getTickets);
router.get('/tickets/:id', container.ticketController.getTicketById);
router.post('/tickets/import', container.ticketController.importTickets);

// ── Managers ─────────────────────────────────────────────────────
router.get('/managers', container.managerController.getManagers);
router.get('/managers/:id', container.managerController.getManagerById);

// ── Offices ──────────────────────────────────────────────────────
router.get('/offices', importCtrl.getOffices);

// ── Import ───────────────────────────────────────────────────────
router.post('/import/offices', importCtrl.importOffices);
router.post('/import/managers', importCtrl.importManagers);

// ── Analytics ────────────────────────────────────────────────────
router.get('/analytics/kanban', container.analyticsController.getKanbanStats);
router.get('/analytics/workload', container.analyticsController.getWorkload);

export default router;

import { TicketRepository } from '../repositories/ticket.repository.js';
import { ManagerRepository } from '../repositories/manager.repository.js';
import { TicketService } from '../services/ticket.service.js';
import { AIService } from '../services/ai.service.js';
import { GeoService } from '../services/geo.service.js';
import { RoutingService } from '../services/routing.service.js';
import { TicketController } from '../controllers/ticket.controller.js';
import { ManagerController } from '../controllers/manager.controller.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';

/** Singleton DI-контейнер: инициализирует все зависимости один раз при старте */
export class DependencyContainer {
    private static instance: DependencyContainer;

    public ticketController: TicketController;
    public managerController: ManagerController;
    public analyticsController: AnalyticsController;

    private constructor() {
        const ticketRepo = new TicketRepository();
        const managerRepo = new ManagerRepository();
        const aiService = new AIService();
        const geoService = new GeoService();
        const routingService = new RoutingService(geoService);
        const ticketService = new TicketService(ticketRepo, managerRepo, aiService, geoService, routingService);

        this.ticketController = new TicketController(ticketService);
        this.managerController = new ManagerController(managerRepo);
        this.analyticsController = new AnalyticsController(new AnalyticsService());
    }

    static getInstance() {
        if (!this.instance) this.instance = new DependencyContainer();
        return this.instance;
    }
}

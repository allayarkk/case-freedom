import { TicketService } from '../services/ticket.service.js';
import { AIService } from '../services/ai.service.js';
import { GeoService } from '../services/geo.service.js';
import { RoutingService } from '../services/routing.service.js';
import { TicketController } from '../controllers/ticket.controller.js';
import { ManagerController } from '../controllers/manager.controller.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { AssistantService } from '../services/assistant.service.js';
import { AssistantController } from '../controllers/assistant.controller.js';

/** Singleton DI-контейнер: инициализирует все зависимости один раз при старте */
export class DependencyContainer {
    private static instance: DependencyContainer;

    public ticketController: TicketController;
    public managerController: ManagerController;
    public analyticsController: AnalyticsController;
    public assistantController: AssistantController;

    private constructor() {
        const aiService = new AIService();
        const geoService = new GeoService();
        const routingService = new RoutingService(geoService);
        const ticketService = new TicketService(aiService, geoService, routingService);
        const assistantService = new AssistantService();

        this.ticketController = new TicketController(ticketService);
        this.managerController = new ManagerController();
        this.analyticsController = new AnalyticsController(new AnalyticsService());
        this.assistantController = new AssistantController(assistantService);
    }

    static getInstance() {
        if (!this.instance) this.instance = new DependencyContainer();
        return this.instance;
    }
}

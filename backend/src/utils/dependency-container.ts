import { TicketRepository } from '../repositories/ticket.repository.js';
import { ManagerRepository } from '../repositories/manager.repository.js';
import { AIService } from '../services/ai.service.js';
import { GeoService } from '../services/geo.service.js';
import { RoutingService } from '../services/routing.service.js';
import { TicketService } from '../services/ticket.service.js';
import { TicketController } from '../controllers/ticket.controller.js';
import { ManagerController } from '../controllers/manager.controller.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { AnalyticsController } from '../controllers/analytics.controller.js';

export class DependencyContainer {
    private static instance: DependencyContainer;

    public ticketRepo = new TicketRepository();
    public managerRepo = new ManagerRepository();

    public aiService = new AIService();
    public geoService = new GeoService();
    public routingService = new RoutingService(this.geoService);

    public analyticsService = new AnalyticsService();

    public ticketService = new TicketService(
        this.ticketRepo,
        this.managerRepo,
        this.aiService,
        this.geoService,
        this.routingService
    );

    public ticketController = new TicketController(this.ticketService);
    public managerController = new ManagerController(this.managerRepo);
    public analyticsController = new AnalyticsController(this.analyticsService);

    private constructor() { }

    public static getInstance(): DependencyContainer {
        if (!DependencyContainer.instance) {
            DependencyContainer.instance = new DependencyContainer();
        }
        return DependencyContainer.instance;
    }
}

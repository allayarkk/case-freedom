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

export class DependencyContainer {
    private static instance: DependencyContainer;

    public ticketRepository: TicketRepository;
    public managerRepository: ManagerRepository;

    public aiService: AIService;
    public geoService: GeoService;
    public routingService: RoutingService;
    public ticketService: TicketService;
    public analyticsService: AnalyticsService;

    public ticketController: TicketController;
    public managerController: ManagerController;
    public analyticsController: AnalyticsController;

    private constructor() {
        // Repos
        this.ticketRepository = new TicketRepository();
        this.managerRepository = new ManagerRepository();

        // Services
        this.aiService = new AIService();
        this.geoService = new GeoService();
        this.routingService = new RoutingService(this.geoService); // Pass GeoService here!

        this.ticketService = new TicketService(
            this.ticketRepository,
            this.managerRepository,
            this.aiService,
            this.geoService,
            this.routingService
        );

        this.analyticsService = new AnalyticsService();

        // Controllers
        this.ticketController = new TicketController(this.ticketService);
        this.managerController = new ManagerController(this.managerRepository);
        this.analyticsController = new AnalyticsController(this.analyticsService);
    }

    public static getInstance(): DependencyContainer {
        if (!DependencyContainer.instance) {
            DependencyContainer.instance = new DependencyContainer();
        }
        return DependencyContainer.instance;
    }
}

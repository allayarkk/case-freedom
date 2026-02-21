import axios from 'axios';

// Relative path — proxied by Next.js rewrites to localhost:3001
const api = axios.create({
    baseURL: '/api/v1',
});

export const ticketService = {
    getTickets: (params?: Record<string, unknown>) => api.get('/tickets', { params }),
    getTicketById: (id: string) => api.get(`/tickets/${id}`),
    createTicket: (data: Record<string, unknown>) => api.post('/tickets', data),
    importTickets: (csv: string) => api.post('/tickets/import', { csv }),
    closeTicket: (id: string) => api.patch(`/tickets/${id}/close`),
};

export const managerService = {
    getManagers: (params?: Record<string, unknown>) => api.get('/managers', { params }),
    getManagerById: (id: string) => api.get(`/managers/${id}`),
};

export const officeService = {
    getOffices: () => api.get('/offices'),
};

export const importService = {
    importOffices: (csv: string) => api.post('/import/offices', { csv }),
    importManagers: (csv: string) => api.post('/import/managers', { csv }),
    importTickets: (csv: string) => api.post('/tickets/import', { csv }),
};

export const analyticsService = {
    getKanbanStats: (officeId?: string) =>
        api.get('/analytics/kanban', { params: officeId ? { officeId } : undefined }),
    getWorkload: () => api.get('/analytics/workload'),
};

export default api;

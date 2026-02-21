import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'admin-1',
        'x-user-role': 'ADMIN'
    }
});

export const ticketService = {
    getTickets: (params?: any) => api.get('/tickets', { params }),
    getTicketById: (id: string) => api.get(`/tickets/${id}`),
    importTickets: (csv: string) => api.post('/tickets/import', { csv }),
    assignTicket: (id: string, managerId: string) => api.post(`/tickets/${id}/assign`, { managerId }),
};

export const managerService = {
    getManagers: (params?: any) => api.get('/managers', { params }),
    getManagerById: (id: string) => api.get(`/managers/${id}`),
};

export const analyticsService = {
    getKanbanStats: (officeId?: string) => api.get('/analytics/kanban', { params: { officeId } }),
    getWorkload: () => api.get('/analytics/workload'),
};

export default api;

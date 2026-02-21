export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    meta?: { page?: number; limit?: number; total?: number;[key: string]: any };
    error?: { message: string; code?: string; details?: any };
}

export const successResponse = <T>(data: T, meta?: any): ApiResponse<T> => ({
    success: true, data, meta,
});

export const errorResponse = (message: string, code?: string, details?: any): ApiResponse => ({
    success: false,
    error: { message, code, details },
});

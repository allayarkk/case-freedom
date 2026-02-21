import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);
    console.error(err.stack);

    res.status(err.statusCode || 500).json({
        success: false,
        error: { message: err.message || 'Internal server error' },
    });
};

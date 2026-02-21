// for logging backend errors
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // LOG THE ACTUAL ERROR TO CONSOLE
    console.error('--- INTERNAL ERROR ---');
    console.error('Path:', req.path);
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    console.error('----------------------');

    const status = err.statusCode || 500;
    res.status(status).json({
        success: false,
        error: {
            message: err.message || 'Internal server error',
        },
    });
};

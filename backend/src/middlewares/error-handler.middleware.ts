import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error.js';
import { errorResponse } from '../utils/api-response.js';
import { StatusCodes } from 'http-status-codes';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('[Error Handler]', err);

    if (err instanceof AppError) {
        return res
            .status(err.statusCode)
            .json(errorResponse(err.message));
    }

    // Prisma errors or other unknown errors
    if ((err as any).code?.startsWith('P')) {
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(errorResponse('Database error', 'DB_ERROR'));
    }

    return res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json(errorResponse('Internal server error'));
};

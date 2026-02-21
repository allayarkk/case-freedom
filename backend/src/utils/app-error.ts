import { StatusCodes } from 'http-status-codes';

export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
        public isOperational: boolean = true
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, StatusCodes.NOT_FOUND);
    }
}

export class ValidationError extends AppError {
    constructor(message: string = 'Validation failed') {
        super(message, StatusCodes.BAD_REQUEST);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access forbidden') {
        super(message, StatusCodes.FORBIDDEN);
    }
}

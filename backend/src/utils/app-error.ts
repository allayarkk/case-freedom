export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class NotFoundError extends AppError {
    constructor(msg = 'Resource not found') { super(msg, 404); }
}

export class ValidationError extends AppError {
    constructor(msg = 'Validation failed') { super(msg, 400); }
}

export class ForbiddenError extends AppError {
    constructor(msg = 'Access forbidden') { super(msg, 403); }
}

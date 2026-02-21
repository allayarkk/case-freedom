import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';

const app = express();

// Security & Basic middlewares
app.use(helmet());
app.use(cors());

// INCREASE LIMITS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global Request Logger (MUST be after body parser)
app.use((req, res, next) => {
    const bodySize = req.body ? JSON.stringify(req.body).length : 0;
    console.log(`[HTTP] ${req.method} ${req.path} | Body size: ${bodySize} chars`);
    next();
});

// Routes
app.use('/api/v1', routes);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        error: { message: 'Resource not found' }
    });
});

// Global error handler
app.use(errorHandler);

export default app;

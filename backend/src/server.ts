import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log(`🚀 FIRE Server running on port ${PORT}`);
});

// INCREASE TIMEOUTS for long-running AI tasks
// 5 minutes (300,000 ms)
server.timeout = 300000;
server.keepAliveTimeout = 300000;
server.headersTimeout = 305000;

// Global error handlers to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Fatal] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[Fatal] Uncaught Exception thrown:', err);
    // In production, you might want to restart the process here
});

import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 8080;

console.log('--- STARTUP DEBUG ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL defined:', !!process.env.DATABASE_URL);
console.log('OPENAI_API_KEY defined:', !!process.env.OPENAI_API_KEY);
console.log('---------------------');

const server = app.listen(PORT, () => {
    console.log(`🚀 [FIRE] Backend is running on port ${PORT}`);
});

// Таймауты для длительных AI-задач (5 мин)
server.timeout = 300_000;
server.keepAliveTimeout = 300_000;
server.headersTimeout = 305_000;

process.on('unhandledRejection', (reason) => console.error('[Fatal] Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => console.error('[Fatal] Uncaught Exception:', err));

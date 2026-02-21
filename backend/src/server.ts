import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => console.log(`🚀 FIRE Server on port ${PORT}`));

// Таймауты для длительных AI-задач (5 мин)
server.timeout = 300_000;
server.keepAliveTimeout = 300_000;
server.headersTimeout = 305_000;

process.on('unhandledRejection', (reason) => console.error('[Fatal] Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => console.error('[Fatal] Uncaught Exception:', err));

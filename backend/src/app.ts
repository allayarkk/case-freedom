import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error-handler.middleware.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, _res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path}`);
    next();
});

app.use('/api/v1', routes);
app.use((_req, res) => res.status(404).json({ success: false, error: { message: 'Not found' } }));
app.use(errorHandler);

export default app;

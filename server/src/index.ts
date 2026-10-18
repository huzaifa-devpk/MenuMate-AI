import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import restaurantRoutes from './routes/restaurant.routes';
import menuRoutes from './routes/menu.routes';
import aiRoutes from './routes/ai.routes';
import publicRoutes from './routes/public.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', publicRoutes); // for /api/health

// Serve frontend in production or if client/dist exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`📦 Serving static frontend from ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // SPA catch-all fallback
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handling middleware (safe, no secret exposure)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: config.nodeEnv === 'production' && status === 500
      ? 'An internal server error occurred. Please try again later.'
      : err.message || 'Server error',
  });
});

app.listen(config.port, () => {
  console.log(`🚀 MenuMate AI Server is running on port ${config.port}`);
  console.log(`🌐 Base URL: ${config.appBaseUrl}`);
  console.log(`🤖 Gemma Provider: ${config.gemma.provider} (${config.gemma.model})`);
});

export default app;

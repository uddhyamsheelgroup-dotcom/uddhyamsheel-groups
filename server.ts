import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDatabase } from './server/db.js';
import { authRouter } from './server/api_auth.js';
import { membersRouter } from './server/api_members.js';
import { savingsRouter } from './server/api_savings.js';
import { contributionsRouter } from './server/api_contributions.js';
import { loansRouter } from './server/api_loans.js';
import { accountingRouter } from './server/api_accounting.js';
import { dashboardReportsRouter } from './server/api_dashboard_reports.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database on startup
initDatabase();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Body parsing with safe size limits
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// REST API Routes
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/savings', savingsRouter);
app.use('/api/contributions', contributionsRouter);
app.use('/api/loans', loansRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api', dashboardReportsRouter);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    organization: 'Uddhyamsheel Group',
    established: '2079 B.S.',
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  if (!isProd) {
    // Development mode with Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production mode with built static assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[UDDHYAMSHEEL] Server operational on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('[UDDHYAMSHEEL] Failed to start server:', err);
  process.exit(1);
});

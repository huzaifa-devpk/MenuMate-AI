import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root or current directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.DATABASE_PATH || path.resolve(__dirname, '../../data/menumate.sqlite'),
  appBaseUrl: (process.env.APP_BASE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  gemma: {
    provider: (process.env.GEMMA_PROVIDER || 'google').toLowerCase() as 'google' | 'groq' | 'openai_compatible',
    apiKey: process.env.GEMMA_API_KEY || '',
    model: process.env.GEMMA_MODEL || 'gemma-2-9b-it',
    apiBaseUrl: process.env.GEMMA_API_BASE_URL || '',
  },
};

import path from "node:path";
import { z } from "zod";

/**
 * All environment configuration is read and validated here so the rest of the
 * server can rely on typed values. Secrets never leave this module except via
 * the AI provider that needs them.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(0).max(65535).default(3001),
  DATABASE_PATH: z.string().min(1).default("./data/menumate.sqlite"),
  APP_BASE_URL: z.string().url().default("http://localhost:5173"),

  GEMMA_API_KEY: z.string().default(""),
  GEMMA_PROVIDER: z.enum(["google", "openai-compatible"]).default("google"),
  GEMMA_MODEL: z.string().min(1).default("gemma-4-31b-it"),
  GEMMA_API_BASE_URL: z.string().url().default("https://generativelanguage.googleapis.com/v1beta"),
  GEMMA_THINKING_LEVEL: z.enum(["minimal", "high"]).default("minimal"),
  GEMMA_TIMEOUT_MS: z.coerce.number().int().min(1000).max(300_000).default(60_000),

  AI_RATE_LIMIT_PER_15_MIN: z.coerce.number().int().min(1).max(10_000).default(30),
});

export type Env = z.infer<typeof envSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const env = parsed.data;
  if (env.DATABASE_PATH !== ":memory:" && !path.isAbsolute(env.DATABASE_PATH)) {
    // Resolve relative DB paths against the repository root (one level above /server)
    // so `npm run dev` and `npm start` use the same file regardless of cwd.
    env.DATABASE_PATH = path.resolve(findRepoRoot(), env.DATABASE_PATH);
  }
  // Normalise: no trailing slash on the public base URL.
  env.APP_BASE_URL = env.APP_BASE_URL.replace(/\/+$/, "");
  return env;
}

function findRepoRoot(): string {
  // When running from /server (dev) or /server/dist (prod) walk up to the root
  // that contains the workspace package.json.
  const cwd = process.cwd();
  return path.basename(cwd) === "server" ? path.dirname(cwd) : cwd;
}

export const config = loadConfig();

export const isProduction = config.NODE_ENV === "production";

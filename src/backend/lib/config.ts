/**
 * Configuration loader for backend services
 * Loads environment variables and provides typed access
 */

import { config as loadEnv } from 'dotenv';

// Load environment variables from .env file
loadEnv();

interface Config {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  openai: {
    apiKey: string;
  };
  anthropic: {
    apiKey: string;
  };
  mcp: {
    hostPort: number;
    hostUrl: string;
  };
  app: {
    nodeEnv: string;
    appUrl: string;
  };
}

/**
 * Get a required environment variable
 * Throws an error if the variable is not set
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Application configuration
 */
export const config: Config = {
  supabase: {
    url: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceRoleKey: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },
  openai: {
    apiKey: getRequiredEnv('OPENAI_API_KEY'),
  },
  anthropic: {
    apiKey: getRequiredEnv('ANTHROPIC_API_KEY'),
  },
  mcp: {
    hostPort: parseInt(getOptionalEnv('MCP_HOST_PORT', '3001')),
    hostUrl: getOptionalEnv('MCP_HOST_URL', 'http://localhost:3001'),
  },
  app: {
    nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
    appUrl: getOptionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  },
};

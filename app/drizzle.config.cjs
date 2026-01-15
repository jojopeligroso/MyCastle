const { defineConfig } = require('drizzle-kit');
require('dotenv').config({ path: '.env.local' });

module.exports = defineConfig({
  out: './drizzle',
  schema: './src/db/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // Use DIRECT_URL for migrations (no pooler), DATABASE_URL for queries (with pooler)
    url:
      process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/mycastle',
  },
  verbose: true,
  strict: true,
});

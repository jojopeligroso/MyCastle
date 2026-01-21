/**
 * Get Tenant ID Script
 */

import { config } from 'dotenv';
import { join } from 'path';
import { db } from '../src/db';
import { tenants } from '../src/db/schema/core';

// Load environment variables
config({ path: join(__dirname, '../.env.local') });

async function getTenantId() {
  try {
    const result = await db.select({ id: tenants.id, name: tenants.name }).from(tenants).limit(1);

    if (result.length > 0) {
      console.log('Tenant ID:', result[0].id);
      console.log('Tenant Name:', result[0].name);
    } else {
      console.log('No tenants found in database');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getTenantId();

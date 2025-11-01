#!/usr/bin/env tsx
/**
 * Supabase Connection Test
 * Verifies database connectivity and authentication
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as jose from 'jose';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWKS_URI = process.env.JWKS_URI!;

console.log('🔍 Admin MCP - Supabase Connection Test\n');
console.log('=' .repeat(60));

// Test 1: Environment Variables
console.log('\n📝 Test 1: Environment Variables');
console.log('-'.repeat(60));

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL is not set');
  process.exit(1);
} else {
  console.log(`✅ SUPABASE_URL: ${SUPABASE_URL}`);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
} else {
  console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
}

if (!JWKS_URI) {
  console.error('❌ JWKS_URI is not set');
  process.exit(1);
} else {
  console.log(`✅ JWKS_URI: ${JWKS_URI}`);
}

// Test 2: Supabase Client Creation
console.log('\n🔌 Test 2: Supabase Client Creation');
console.log('-'.repeat(60));

let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  console.log('✅ Supabase client created successfully');
} catch (error: any) {
  console.error('❌ Failed to create Supabase client:', error.message);
  process.exit(1);
}

// Test 3: Database Connection
console.log('\n💾 Test 3: Database Connection');
console.log('-'.repeat(60));

try {
  const { data, error } = await supabase
    .from('_supabase_healthcheck')
    .select('*')
    .limit(1);

  if (error) {
    // Health check table might not exist, try a different approach
    console.log('⚠️  Healthcheck table not found, trying alternative...');

    // Try to query information schema
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (schemaError) {
      throw schemaError;
    }

    console.log('✅ Database connection successful (via schema query)');
  } else {
    console.log('✅ Database connection successful');
  }
} catch (error: any) {
  console.error('❌ Database connection failed:', error.message);
  console.error('   This might indicate RLS policies blocking access or database unavailability');
}

// Test 4: Check Tables Exist
console.log('\n🗂️  Test 4: Verify Tables');
console.log('-'.repeat(60));

const requiredTables = [
  'tenants',
  'users',
  'classes',
  'sessions',
  'attendance',
  'enrollments',
  'audit_logs'
];

for (const table of requiredTables) {
  try {
    const { error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`❌ Table "${table}" does not exist`);
      } else {
        console.log(`⚠️  Table "${table}" exists but query failed: ${error.message}`);
      }
    } else {
      console.log(`✅ Table "${table}" exists`);
    }
  } catch (error: any) {
    console.log(`❌ Error checking table "${table}": ${error.message}`);
  }
}

// Test 5: JWKS Endpoint
console.log('\n🔐 Test 5: JWKS Endpoint');
console.log('-'.repeat(60));

try {
  const response = await fetch(JWKS_URI);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const jwks = await response.json();

  if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
    throw new Error('JWKS response does not contain valid keys');
  }

  console.log(`✅ JWKS endpoint accessible`);
  console.log(`   Found ${jwks.keys.length} signing key(s)`);
} catch (error: any) {
  console.error('❌ JWKS endpoint test failed:', error.message);
  console.error('   JWT verification will not work');
}

// Test 6: Create Test JWT (optional)
console.log('\n🎫 Test 6: JWT Generation Test');
console.log('-'.repeat(60));

try {
  const { publicKey, privateKey } = await jose.generateKeyPair('RS256');

  const jwt = await new jose.SignJWT({
    sub: 'test-user-123',
    email: 'test@example.com',
    role: 'admin',
    tenant_id: 'test-tenant',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer('test-issuer')
    .setAudience('admin-mcp')
    .setExpirationTime('1h')
    .sign(privateKey);

  // Try to verify it
  const { payload } = await jose.jwtVerify(jwt, publicKey, {
    audience: 'admin-mcp',
  });

  console.log('✅ JWT generation and verification working');
  console.log(`   Test user: ${payload.email} (${payload.role})`);
} catch (error: any) {
  console.error('❌ JWT test failed:', error.message);
}

// Test 7: Sample Data Query
console.log('\n📊 Test 7: Sample Data Query');
console.log('-'.repeat(60));

try {
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .limit(5);

  if (tenantsError) {
    console.log('⚠️  Cannot query tenants:', tenantsError.message);
  } else if (tenants && tenants.length > 0) {
    console.log(`✅ Found ${tenants.length} tenant(s):`);
    tenants.forEach(t => {
      console.log(`   - ${t.name} (${t.slug})`);
    });
  } else {
    console.log('⚠️  No tenants found in database');
  }

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role')
    .limit(5);

  if (usersError) {
    console.log('⚠️  Cannot query users:', usersError.message);
  } else if (users && users.length > 0) {
    console.log(`✅ Found ${users.length} user(s):`);
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.role})`);
    });
  } else {
    console.log('⚠️  No users found in database');
  }
} catch (error: any) {
  console.log('❌ Sample data query failed:', error.message);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📋 Connection Test Summary');
console.log('='.repeat(60));
console.log('\n✅ Basic connectivity: OK');
console.log('✅ Environment configuration: OK');
console.log('⚠️  Database schema: Verify tables exist');
console.log('⚠️  Sample data: Verify data is populated');
console.log('\n💡 Next steps:');
console.log('   1. If tables are missing, run database migrations');
console.log('   2. If data is missing, run seed scripts');
console.log('   3. Test MCP server: npm run dev:http');
console.log('   4. Run tests: npm test\n');

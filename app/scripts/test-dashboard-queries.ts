import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Mock auth context
process.env.USER_EMAIL = 'eoinmaleoin@gmail.com';

async function testDashboard() {
  try {
    console.log('🧪 Testing dashboard queries...\n');

    // Import functions after env is loaded
    const { getAdminKPIs, getRecentAuditEvents, getAdminAlerts, getAdminWorkQueue } = await import('../src/app/admin/_actions/dashboard');

    // Test 1: KPIs (was failing on setRLSContext)
    console.log('1️⃣ Testing getAdminKPIs...');
    const kpis = await getAdminKPIs();
    console.log('   ✅ Success:', {
      activeStudents: kpis.activeStudents,
      attendanceRate7d: kpis.attendanceRate7d,
    });

    // Test 2: Audit Events (was throwing "Tenant not found")
    console.log('\n2️⃣ Testing getRecentAuditEvents...');
    const events = await getRecentAuditEvents();
    console.log('   ✅ Success:', events.length, 'events found');

    // Test 3: Alerts
    console.log('\n3️⃣ Testing getAdminAlerts...');
    const alerts = await getAdminAlerts();
    console.log('   ✅ Success:', alerts.length, 'alerts found');

    // Test 4: Work Queue
    console.log('\n4️⃣ Testing getAdminWorkQueue...');
    const workQueue = await getAdminWorkQueue();
    console.log('   ✅ Success:', workQueue.length, 'items found');

    console.log('\n🎉 All dashboard queries passed!');

  } catch (error) {
    console.error('❌ Dashboard test failed:', error);
    process.exit(1);
  }
}

testDashboard();

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in .env');
  process.exit(1);
}

async function cleanSlate() {
  const pool = new Pool({ connectionString });
  console.log('🚀 Starting Clean Slate operation...');

  try {
    // 1. Find all generated tables (starting with app_)
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'app_%'
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} generated tables.`);

    // 2. Drop all generated tables
    for (const table of tables) {
      console.log(`Dropping table: ${table}...`);
      await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    // 3. Clear platform tables
    console.log('Clearing platform tables...');
    await pool.query('TRUNCATE _platform_apps, _platform_notifications, _platform_users CASCADE');

    console.log('✅ Clean Slate complete. Database is now empty and ready for fresh tests.');
  } catch (error) {
    console.error('❌ Clean Slate failed:', error);
  } finally {
    await pool.end();
  }
}

cleanSlate();

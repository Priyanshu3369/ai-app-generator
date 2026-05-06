import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: connectionString.includes('neon.') || connectionString.includes('supabase')
        ? { rejectUnauthorized: false }
        : undefined,
    });
    pool.on('error', (err) => {
      console.error('Unexpected PostgreSQL pool error:', err);
    });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const client = getPool();
  try {
    return await client.query(text, params);
  } catch (error) {
    console.error('DB query error:', { text: text.substring(0, 200), error });
    throw error;
  }
}

export async function initPlatformTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS _platform_apps (
      id TEXT PRIMARY KEY,
      config JSONB NOT NULL,
      user_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS _platform_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      app_id TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE NULLS NOT DISTINCT (email, app_id)
    )
  `);

  try {
    await query('ALTER TABLE _platform_users DROP CONSTRAINT IF EXISTS _platform_users_email_key');
  } catch (e) {}

  // Safely add unique constraint using DO block
  await query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_platform_users_email_app_id_key') THEN
        BEGIN
          ALTER TABLE _platform_users ADD CONSTRAINT _platform_users_email_app_id_key UNIQUE NULLS NOT DISTINCT (email, app_id);
        EXCEPTION WHEN others THEN
          ALTER TABLE _platform_users ADD CONSTRAINT _platform_users_email_app_id_key UNIQUE (email, app_id);
        END;
      END IF;
    END $$;
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS _platform_notifications (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      user_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_notif_app_user ON _platform_notifications(app_id, user_id, read)`);
}

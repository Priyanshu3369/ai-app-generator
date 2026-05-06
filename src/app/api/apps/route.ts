import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { parseConfig } from '@/lib/config-parser';
import { query, initPlatformTables } from '@/lib/db/pool';
import { createTablesForApp } from '@/lib/db/schema-builder';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/apps — list all apps
export async function GET() {
  try {
    await initPlatformTables();
    const result = await query('SELECT id, config->>\'appName\' as name, config->>\'description\' as description, created_at FROM _platform_apps ORDER BY created_at DESC');
    return Response.json({ success: true, data: result.rows });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/apps — create a new app from JSON config
export async function POST(request: NextRequest) {
  try {
    await initPlatformTables();
    const body = await request.json();
    const rawConfig = body.config || body;
    const { config, warnings } = parseConfig(rawConfig);
    const appId = uuidv4();
    config.appId = appId;

    // Save app config
    await query(
      'INSERT INTO _platform_apps (id, config) VALUES ($1, $2)',
      [appId, JSON.stringify(config)]
    );

    // Create database tables for all models
    const tableMap = await createTablesForApp(appId, config.models);

    return Response.json({
      success: true,
      data: { appId, appName: config.appName, tableMap, warnings },
      message: 'App created successfully'
    }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

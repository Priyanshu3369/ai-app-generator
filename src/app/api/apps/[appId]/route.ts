import { NextRequest } from 'next/server';
import { query, initPlatformTables } from '@/lib/db/pool';
import { createTablesForApp } from '@/lib/db/schema-builder';
import { parseConfig } from '@/lib/config-parser';

export const dynamic = 'force-dynamic';

// GET /api/apps/[appId] — get app config
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    await initPlatformTables();
    const result = await query('SELECT * FROM _platform_apps WHERE id = $1', [appId]);
    if (result.rows.length === 0) {
      return Response.json({ success: false, error: 'App not found' }, { status: 404 });
    }
    return Response.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// PUT /api/apps/[appId] — update app config
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const body = await request.json();
    const rawConfig = body.config || body;
    const { config, warnings } = parseConfig(rawConfig);
    config.appId = appId;

    await query(
      'UPDATE _platform_apps SET config = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(config), appId]
    );

    // Ensure tables exist / evolve schema
    await createTablesForApp(appId, config.models, config.appName);

    return Response.json({ success: true, data: { appId, warnings }, message: 'App updated' });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/apps/[appId] — delete app and all associated data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;

    // 1. Fetch app config to find all custom models/tables
    const appRes = await query('SELECT config FROM _platform_apps WHERE id = $1', [appId]);
    if (appRes.rows.length > 0) {
      const config = appRes.rows[0].config;
      const models = config.models || [];
      
      // 2. Drop all app-specific data tables
      for (const model of models) {
        const tableName = `app_${appId.replace(/-/g, '_')}_${(model.tableName || model.name).toLowerCase()}`;
        await query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
      }
    }

    // 3. Delete related platform data
    await query('DELETE FROM _platform_notifications WHERE app_id = $1', [appId]);
    await query('DELETE FROM _platform_users WHERE app_id = $1', [appId]);

    // 4. Finally delete the app itself
    await query('DELETE FROM _platform_apps WHERE id = $1', [appId]);

    return Response.json({ success: true, message: 'App and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

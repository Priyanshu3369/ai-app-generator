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
    await createTablesForApp(appId, config.models);

    return Response.json({ success: true, data: { appId, warnings }, message: 'App updated' });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/apps/[appId] — delete app
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    await query('DELETE FROM _platform_apps WHERE id = $1', [appId]);
    return Response.json({ success: true, message: 'App deleted' });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

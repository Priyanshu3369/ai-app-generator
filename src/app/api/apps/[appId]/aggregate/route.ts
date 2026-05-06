import { NextRequest } from 'next/server';
import { query, initPlatformTables } from '@/lib/db/pool';
import { aggregate } from '@/lib/db/query-builder';
import { AppConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    await initPlatformTables();
    const configResult = await query('SELECT config FROM _platform_apps WHERE id = $1', [appId]);
    if (configResult.rows.length === 0) {
      return Response.json({ success: false, error: 'App not found' }, { status: 404 });
    }
    const config: AppConfig = configResult.rows[0].config;
    const url = request.nextUrl;
    const model = url.searchParams.get('model');
    const type = url.searchParams.get('type') || 'count';
    const field = url.searchParams.get('field') || undefined;

    if (!model) return Response.json({ success: false, error: 'model param required' }, { status: 400 });
    if (!config.models.find(m => m.name === model)) {
      return Response.json({ success: false, error: `Model "${model}" not found` }, { status: 404 });
    }

    const value = await aggregate(appId, model, type, field);
    return Response.json({ success: true, data: { value } });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

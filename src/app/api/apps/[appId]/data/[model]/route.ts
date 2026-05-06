import { NextRequest } from 'next/server';
import { query, initPlatformTables } from '@/lib/db/pool';
import { findMany, findOne, create, update, remove } from '@/lib/db/query-builder';
import { authenticateRequest } from '@/lib/auth';
import { processEventTriggers } from '@/lib/notifications';
import { AppConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function getAppConfig(appId: string): Promise<AppConfig | null> {
  await initPlatformTables();
  const result = await query('SELECT config FROM _platform_apps WHERE id = $1', [appId]);
  return result.rows[0]?.config || null;
}

// GET — list records or get single record by ?id=xxx
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; model: string }> }
) {
  try {
    const { appId, model } = await params;
    const config = await getAppConfig(appId);
    if (!config) return Response.json({ success: false, error: 'App not found' }, { status: 404 });

    const modelConfig = config.models.find(m => m.name === model);
    if (!modelConfig) return Response.json({ success: false, error: `Model "${model}" not found` }, { status: 404 });

    const url = request.nextUrl;
    const id = url.searchParams.get('id');

    // Auth check
    const user = authenticateRequest(request);
    const userId = user?.userId;

    if (id) {
      const record = await findOne(appId, model, id, userId, modelConfig.userScoped, config.appName);
      if (!record) return Response.json({ success: false, error: 'Record not found' }, { status: 404 });
      return Response.json({ success: true, data: record });
    }

    const searchFields = modelConfig.fields.filter(f => f.searchable).map(f => f.name);
    const result = await findMany(appId, model, {
      page: parseInt(url.searchParams.get('page') || '1'),
      pageSize: parseInt(url.searchParams.get('pageSize') || '25'),
      sortBy: url.searchParams.get('sortBy') || 'created_at',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      search: url.searchParams.get('search') || undefined,
      searchFields,
      userId,
      userScoped: modelConfig.userScoped,
    }, config.appName);

    return Response.json({ success: true, ...result });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// POST — create a record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; model: string }> }
) {
  try {
    const { appId, model } = await params;
    const config = await getAppConfig(appId);
    if (!config) return Response.json({ success: false, error: 'App not found' }, { status: 404 });

    const modelConfig = config.models.find(m => m.name === model);
    if (!modelConfig) return Response.json({ success: false, error: `Model "${model}" not found` }, { status: 404 });

    const body = await request.json();
    const user = authenticateRequest(request);

    // Validate required fields
    const errors: string[] = [];
    for (const field of modelConfig.fields) {
      if (field.required && field.name !== 'id' && !body[field.name] && body[field.name] !== 0 && body[field.name] !== false) {
        errors.push(`${field.label || field.name} is required`);
      }
    }
    if (errors.length > 0) {
      return Response.json({ success: false, error: errors.join(', ') }, { status: 400 });
    }

    const record = await create(appId, model, body, user?.userId, modelConfig.userScoped, config.appName);

    // Process notification triggers
    if (config.notifications && config.notifications.length > 0) {
      processEventTriggers(config.notifications, model, 'create', record, appId, user?.userId || null);
    }

    return Response.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// PUT — update a record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; model: string }> }
) {
  try {
    const { appId, model } = await params;
    const config = await getAppConfig(appId);
    if (!config) return Response.json({ success: false, error: 'App not found' }, { status: 404 });

    const modelConfig = config.models.find(m => m.name === model);
    if (!modelConfig) return Response.json({ success: false, error: `Model "${model}" not found` }, { status: 404 });

    const body = await request.json();
    if (!body.id) return Response.json({ success: false, error: 'id is required for update' }, { status: 400 });

    const user = authenticateRequest(request);
    const record = await update(appId, model, body.id, body, user?.userId, modelConfig.userScoped, config.appName);

    if (config.notifications && config.notifications.length > 0) {
      processEventTriggers(config.notifications, model, 'update', record, appId, user?.userId || null);
    }

    return Response.json({ success: true, data: record });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// DELETE — delete a record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string; model: string }> }
) {
  try {
    const { appId, model } = await params;
    const config = await getAppConfig(appId);
    if (!config) return Response.json({ success: false, error: 'App not found' }, { status: 404 });

    const modelConfig = config.models.find(m => m.name === model);
    if (!modelConfig) return Response.json({ success: false, error: `Model "${model}" not found` }, { status: 404 });

    const url = request.nextUrl;
    const id = url.searchParams.get('id');
    if (!id) return Response.json({ success: false, error: 'id is required' }, { status: 400 });

    const user = authenticateRequest(request);
    await remove(appId, model, id, user?.userId, modelConfig.userScoped, modelConfig.softDelete, config.appName);

    if (config.notifications && config.notifications.length > 0) {
      processEventTriggers(config.notifications, model, 'delete', { id }, appId, user?.userId || null);
    }

    return Response.json({ success: true, message: 'Record deleted' });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

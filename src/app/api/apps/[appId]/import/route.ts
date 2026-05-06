import { NextRequest } from 'next/server';
import { query, initPlatformTables } from '@/lib/db/pool';
import { bulkCreate } from '@/lib/db/query-builder';
import { authenticateRequest } from '@/lib/auth';
import { AppConfig } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(
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

    const body = await request.json();
    const { model, records, mapping } = body;

    if (!model || !records || !Array.isArray(records)) {
      return Response.json({ success: false, error: 'model and records[] are required' }, { status: 400 });
    }

    const modelConfig = config.models.find(m => m.name === model);
    if (!modelConfig) {
      return Response.json({ success: false, error: `Model "${model}" not found` }, { status: 404 });
    }

    // Apply column mapping if provided
    const mappedRecords = records.map((row: Record<string, unknown>) => {
      if (!mapping) return row;
      const mapped: Record<string, unknown> = {};
      for (const [csvCol, modelField] of Object.entries(mapping as Record<string, string>)) {
        if (modelField && row[csvCol] !== undefined) {
          mapped[modelField] = row[csvCol];
        }
      }
      return mapped;
    });

    const user = authenticateRequest(request);
    const results = await bulkCreate(appId, model, mappedRecords, user?.userId, modelConfig.userScoped);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return Response.json({
      success: true,
      data: { imported: successCount, failed: failCount, errors: results.filter(r => !r.success) },
      message: `Imported ${successCount} records, ${failCount} failed`
    });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

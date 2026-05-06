import { NextRequest } from 'next/server';
import { getNotifications, markAsRead, markAllAsRead } from '@/lib/notifications';
import { authenticateRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const user = authenticateRequest(request);
    const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true';
    const notifications = await getNotifications(appId, user?.userId, unreadOnly);
    return Response.json({ success: true, data: notifications });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const user = authenticateRequest(request);
    const body = await request.json();

    if (body.markAll && user?.userId) {
      await markAllAsRead(appId, user.userId);
    } else if (body.id) {
      await markAsRead(body.id);
    }
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

import { NextRequest } from 'next/server';
import { signup, login, authenticateRequest } from '@/lib/auth';
import { initPlatformTables } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await initPlatformTables();
    const body = await request.json();
    const { action, email, password, name, appId } = body;

    if (!email || !password) {
      return Response.json({ success: false, error: 'Email and password are required' }, { status: 400 });
    }

    if (action === 'signup') {
      const result = await signup(email, password, name, appId);
      return Response.json({ success: true, data: result }, { status: 201 });
    } else if (action === 'login') {
      const result = await login(email, password, appId);
      return Response.json({ success: true, data: result });
    } else {
      return Response.json({ success: false, error: 'Invalid action. Use "login" or "signup"' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ success: false, error: (error as Error).message }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  const user = authenticateRequest(request);
  if (!user) {
    return Response.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  return Response.json({ success: true, data: user });
}

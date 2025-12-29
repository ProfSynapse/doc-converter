import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production'
);

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:8080';

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');

  if (!token) return false;

  try {
    await jwtVerify(token.value, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const isAuthenticated = await verifyAuth(request);

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${FLASK_API_URL}/api/admin/metrics/stats`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      // Return mock data if Flask endpoint not yet implemented
      return NextResponse.json({
        totalConversions: 0,
        successfulConversions: 0,
        failedConversions: 0,
        totalPageViews: 0,
        uniqueVisitors: 0,
        formatBreakdown: {
          docx: 0,
          pdf: 0,
          gdocs: 0,
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stats fetch error:', error);
    // Return empty stats on error
    return NextResponse.json({
      totalConversions: 0,
      successfulConversions: 0,
      failedConversions: 0,
      totalPageViews: 0,
      uniqueVisitors: 0,
      formatBreakdown: {
        docx: 0,
        pdf: 0,
        gdocs: 0,
      },
    });
  }
}

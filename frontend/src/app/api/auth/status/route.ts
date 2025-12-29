import { NextRequest, NextResponse } from 'next/server';

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${FLASK_API_URL}/auth/status`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Auth status proxy error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Failed to check auth status' },
      { status: 200 }
    );
  }
}

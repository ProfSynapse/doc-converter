import { NextRequest, NextResponse } from 'next/server';

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Forward the request to Flask backend
    const response = await fetch(`${FLASK_API_URL}/api/convert`, {
      method: 'POST',
      body: formData,
      headers: {
        // Forward cookies for session-based auth
        cookie: request.headers.get('cookie') || '',
      },
    });

    // Get the response data
    const data = await response.json();

    // Return the response with the same status
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Conversion proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to conversion service', code: 'PROXY_ERROR' },
      { status: 502 }
    );
  }
}

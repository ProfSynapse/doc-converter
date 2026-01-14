import { NextResponse } from 'next/server';

// This endpoint provides runtime configuration to the client
// Environment variables are read at runtime, not build time
export async function GET() {
  const flaskApiUrl = process.env.FLASK_API_URL || 'http://localhost:8080';

  console.log('[Config API] Returning FLASK_API_URL:', flaskApiUrl);

  return NextResponse.json({
    flaskApiUrl,
  });
}

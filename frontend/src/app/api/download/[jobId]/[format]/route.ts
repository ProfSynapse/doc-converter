import { NextRequest, NextResponse } from 'next/server';

const FLASK_API_URL = process.env.FLASK_API_URL || 'http://localhost:8080';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; format: string }> }
) {
  try {
    const { jobId, format } = await params;

    // Forward the request to Flask backend
    const response = await fetch(
      `${FLASK_API_URL}/api/download/${jobId}/${format}`,
      {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Download failed' }));
      return NextResponse.json(error, { status: response.status });
    }

    // Stream the file response
    const blob = await response.blob();
    const headers = new Headers();

    // Copy relevant headers from Flask response
    const contentType = response.headers.get('content-type');
    const contentDisposition = response.headers.get('content-disposition');

    if (contentType) headers.set('Content-Type', contentType);
    if (contentDisposition) headers.set('Content-Disposition', contentDisposition);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Download proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to download file', code: 'PROXY_ERROR' },
      { status: 502 }
    );
  }
}

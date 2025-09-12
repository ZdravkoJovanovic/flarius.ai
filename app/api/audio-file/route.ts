import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const segment = searchParams.get('segment');
    
    if (!sessionId || !segment) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }
    
    const filePath = join(process.cwd(), 'audio-segments', 'recordings', sessionId, `segment-${segment}.webm`);
    
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    const fileBuffer = readFileSync(filePath);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/webm',
        'Content-Disposition': `attachment; filename="audio-${sessionId}.webm"`,
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
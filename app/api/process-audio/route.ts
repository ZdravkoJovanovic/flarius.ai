import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    const segmentIndex = formData.get('segmentIndex') as string;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Session-Verzeichnis erstellen
    const sessionDir = join(process.cwd(), 'audio-segments', 'recordings', sessionId);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }

    // Datei in einen Buffer konvertieren und speichern
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const fileName = `segment-${segmentIndex}.webm`;
    const filePath = join(sessionDir, fileName);
    writeFileSync(filePath, buffer);
    
    // PyAnnote API aufrufen (für jedes Segment)
    const API_KEY = process.env.PYNOTE_AI_KEY;
    if (!API_KEY) {
      throw new Error('PYNOTE_AI_KEY environment variable is not set');
    }
    
    const API_URL = 'https://api.pyannote.ai/v1/diarize';
    
    // NGrok URL verwenden
    const baseUrl = process.env.NEXTAUTH_URL || 'https://431e0cc2147f.ngrok.app';
    const webhookUrl = `${baseUrl}/api/webhook?sessionId=${sessionId}`;
    
    // URL für die Audio-Datei
    const fileUrl = `${baseUrl}/api/audio-file?sessionId=${sessionId}&segment=${segmentIndex}`;
    
    console.log('Sende an PyAnnote:', { fileUrl, webhookUrl });
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: fileUrl,
        webhook: webhookUrl
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PyAnnote API error details:', errorText);
      throw new Error(`PyAnnote API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    return NextResponse.json({ 
      success: true, 
      jobId: result.jobId,
      status: result.status
    });
  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
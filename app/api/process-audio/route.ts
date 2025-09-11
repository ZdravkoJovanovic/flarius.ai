import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Datei in einen Buffer konvertieren
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Temporäre Datei speichern
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    
    const fileName = `audio-${Date.now()}.webm`;
    const filePath = join(tempDir, fileName);
    writeFileSync(filePath, buffer);
    
    // PyAnnote API aufrufen
    const API_KEY = process.env.PYNOTE_AI_KEY;
    if (!API_KEY) {
      throw new Error('PYNOTE_AI_KEY environment variable is not set');
    }
    
    const API_URL = 'https://api.pyannote.ai/v1/diarize';
    const webhookUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhook`;
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/temp/${fileName}`,
        webhook: webhookUrl
      })
    });

    if (!response.ok) {
      throw new Error(`PyAnnote API error: ${response.statusText}`);
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
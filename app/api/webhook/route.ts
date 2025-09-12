import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Interface für die Ergebnisstruktur
interface DiarizationResult {
  segments: any[];
  speakers: string[];
  sessionId?: string;
}

// Einfache In-Memory-Speicherung für Demo-Zwecke
const results = new Map();

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const data = await request.json();
    
    // Ergebnisse speichern
    if (data.jobId && sessionId) {
      // Extrahieren der Diarisierungsergebnisse aus der PyAnnote-Antwort
      const diarization = data.output?.diarization || [];
      const segments = diarization.map((item: any) => ({
        start: item.start,
        end: item.end,
        speaker: item.speaker,
      }));
      
      // Sprecher extrahieren und als string[] typisieren
      const speakers = Array.from(
        new Set(segments.map((segment: any) => segment.speaker))
      ) as string[];

      // Vorherige Ergebnisse für diese Session laden
      let existingResults: DiarizationResult = { segments: [], speakers: [] };
      const resultDir = join(process.cwd(), 'audio-segments', 'processed', sessionId);
      const filePath = join(resultDir, 'results.json');
      
      if (existsSync(filePath)) {
        try {
          existingResults = JSON.parse(readFileSync(filePath, 'utf8'));
        } catch (error) {
          console.error('Error reading existing results:', error);
        }
      }
      
      // Neue Segmente hinzufügen (Duplikate vermeiden)
      const newSegments = segments.filter((newSegment: any) => 
        !existingResults.segments.some((existing: any) => 
          existing.start === newSegment.start && existing.end === newSegment.end
        )
      );
      
      existingResults.segments = [...existingResults.segments, ...newSegments];
      existingResults.segments.sort((a: any, b: any) => a.start - b.start);
      
      // Sprecher aktualisieren (explizit als string[] typisieren)
      existingResults.speakers = Array.from(
        new Set([...existingResults.speakers, ...speakers])
      ) as string[];
      
      // Session-ID hinzufügen
      existingResults.sessionId = sessionId;
      
      // Ergebnisse speichern
      results.set(data.jobId, existingResults);
      
      if (!existsSync(resultDir)) {
        mkdirSync(resultDir, { recursive: true });
      }
      
      writeFileSync(filePath, JSON.stringify(existingResults, null, 2));
      
      console.log('Webhook received for session:', sessionId);
    }
    
    return NextResponse.json({ status: 'received' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const sessionId = searchParams.get('sessionId');
  
  if (jobId && results.has(jobId)) {
    return NextResponse.json(results.get(jobId));
  }
  
  if (sessionId) {
    // Versuchen, Ergebnisse aus der Datei zu laden
    const filePath = join(process.cwd(), 'audio-segments', 'processed', sessionId, 'results.json');
    if (existsSync(filePath)) {
      try {
        const data = JSON.parse(readFileSync(filePath, 'utf8'));
        return NextResponse.json(data);
      } catch (error) {
        console.error('Error reading results file:', error);
      }
    }
  }
  
  return NextResponse.json({ error: 'Job or session not found' }, { status: 404 });
}
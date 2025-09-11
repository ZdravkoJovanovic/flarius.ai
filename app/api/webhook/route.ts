import { NextRequest, NextResponse } from 'next/server';

// Einfache In-Memory-Speicherung für Demo-Zwecke
// In einer echten Anwendung würden Sie eine Datenbank verwenden
const results = new Map();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Ergebnisse speichern
    if (data.jobId) {
      results.set(data.jobId, data);
      console.log('Webhook received for job:', data.jobId);
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
  
  if (jobId && results.has(jobId)) {
    return NextResponse.json(results.get(jobId));
  }
  
  return NextResponse.json({ error: 'Job not found' }, { status: 404 });
}
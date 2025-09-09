import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Nachricht ist erforderlich' },
        { status: 400 }
      );
    }

    // System-Prompt für den Mathelehrer
    const systemPrompt = `Du bist ein Mathelehrer eines Gymnasiums der Oberstufe. 
    Deine Antworten sollten fachlich präzise, aber für Oberstufenschüler verständlich sein.
    Verwende mathematische Notationen korrekt und formatiere deine Antworten klar und strukturiert.
    Gehe auf die spezifische Frage ein und bleibe beim Thema.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Verwende das aktuellste verfügbare Modell
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    // Saubere Ausgabe der AI-Antwort
    console.log('🤖 AI Antwort des Mathelehrers:');
    console.log('─'.repeat(50));
    console.log(aiResponse);
    console.log('─'.repeat(50));

    return NextResponse.json({ 
      success: true, 
      message: 'Nachricht erfolgreich empfangen',
      response: aiResponse
    });

  } catch (error) {
    console.error('❌ Fehler:', error);
    return NextResponse.json(
      { success: false, error: 'Serverfehler' },
      { status: 500 }
    );
  }
}
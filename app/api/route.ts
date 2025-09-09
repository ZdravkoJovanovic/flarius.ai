import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Funktion zur Bereinigung und Formatierung der Antwort
function formatResponse(text: string | null): string {
  if (!text) return '';
  
  // Entferne Markdown-Syntax
  let formattedText = text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Fettdruck entfernen
    .replace(/\*(.*?)\*/g, '$1')     // Kursivdruck entfernen
    .replace(/_(.*?)_/g, '$1')       // Unterstrichen entfernen
    .replace(/`(.*?)`/g, '$1')       // Code-Formatierung entfernen
    .replace(/#{1,6}\s?/g, '')       // Überschriften entfernen
    .replace(/\n{3,}/g, '\n\n');     // Mehrere Leerzeilen reduzieren

  // Ersetze mathematische Notationen mit korrekten Zeichen
  formattedText = formattedText
    .replace(/\\times/g, '×')
    .replace(/\*/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\sqrt/g, '√')
    .replace(/\\frac{(.*?)}{(.*?)}/g, '$1/$2')
    .replace(/\\pi/g, 'π');

  // Füge korrekte Zeilenumbrüche für Listen hinzu
  formattedText = formattedText
    .replace(/(\d+\.)\s/g, '\n$1 ')  // Nummerierte Listen
    .replace(/(-|\*)\s/g, '\n• ');   // Aufzählungszeichen

  // Entferne überflüssige Leerzeichen und formatierte Absätze
  formattedText = formattedText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return formattedText;
}

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
    Gehe auf die spezifische Frage ein und bleibe beim Thema.
    
    Wichtige Formatierungsregeln:
    1. Verwende keine Markdown-Syntax (**Fett**, *Kursiv*, etc.)
    2. Verwende für Aufzählungen einfache Zahlen mit Punkten (1., 2., etc.)
    3. Für mathematische Operationen verwende die Standardzeichen (× statt *, ÷ statt /)
    4. Halte Absätze kurz und übersichtlich
    5. Verwende Leerzeilen zur Trennung von Gedanken`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';
    const formattedResponse = formatResponse(aiResponse);
    
    // Saubere Ausgabe der AI-Antwort
    console.log('🤖 AI Antwort des Mathelehrers:');
    console.log('─'.repeat(50));
    console.log(formattedResponse);
    console.log('─'.repeat(50));

    return NextResponse.json({ 
      success: true, 
      message: 'Nachricht erfolgreich empfangen',
      response: formattedResponse
    });

  } catch (error) {
    console.error('❌ Fehler:', error);
    return NextResponse.json(
      { success: false, error: 'Serverfehler' },
      { status: 500 }
    );
  }
}
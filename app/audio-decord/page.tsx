'use client';

import { useState, useRef, useEffect } from 'react';

interface SpeakerSegment {
  start: number;
  end: number;
  speaker: string;
  text?: string;
}

interface DiarizationResult {
  speakers: string[];
  segments: SpeakerSegment[];
  sessionId: string;
}

export default function AudioRecord() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [results, setResults] = useState<DiarizationResult | null>(null);
  const [speakerColors] = useState<Record<string, string>>({
    'SPEAKER_00': '#E3198A',
    'SPEAKER_01': '#10B981', 
    'SPEAKER_02': '#3B82F6',
    'SPEAKER_03': '#F59E0B',
    'SPEAKER_04': '#8B5CF6'
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionIdRef = useRef<string>('');
  const segmentIndexRef = useRef<number>(0);
  const segmentIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingJobsRef = useRef<Set<string>>(new Set());

  // Timer für Aufnahmedauer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 3600) {
            stopRecording();
            return 3600;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (!isRecording && recordingTime !== 0 && interval) {
      clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, recordingTime]);

  // Wellenform-Animation
  useEffect(() => {
    if (!isRecording || !analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording || !analyserRef.current) return;

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        ctx.fillStyle = '#E3198A';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isRecording]);

  // Polling für Ergebnisse
  useEffect(() => {
    if (!isRecording || !sessionIdRef.current) return;

    const pollResults = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
        const response = await fetch(`${baseUrl}/api/webhook?sessionId=${sessionIdRef.current}`);
        
        if (response.ok) {
          const result = await response.json();
          if (result && result.segments) {
            setResults(result);
          }
        }
      } catch (error) {
        console.error('Error polling results:', error);
      }
    };

    const pollingInterval = setInterval(pollResults, 3000);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [isRecording]);

  // Mikrofon-Erlaubnis anfordern
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: false 
      });
      
      setPermissionGranted(true);
      streamRef.current = stream;
      
      // AudioContext für Wellenform erstellen
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyserNode = audioCtx.createAnalyser();
      
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyserNode;
      
      // MediaRecorder für Aufnahme vorbereiten
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = mediaRecorder;
      
      // Audio-Daten sammeln
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.addEventListener('stop', async () => {
        setIsRecording(false);
      });
      
    } catch (err) {
      console.error('Mikrofon-Zugriff verweigert:', err);
      alert('Mikrofon-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff.');
    }
  };

  // Audio an API senden
  const sendAudioToApi = async (audioBlob: Blob, segmentIndex: string | number) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, `segment-${segmentIndex}.webm`);
    formData.append('sessionId', sessionIdRef.current);
    formData.append('segmentIndex', segmentIndex.toString());

    try {
      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Audio segment processed successfully:', result);
        
        if (result.jobId) {
          processingJobsRef.current.add(result.jobId);
        }
      } else {
        console.error('Failed to process audio segment');
      }
    } catch (error) {
      console.error('Error sending audio to API:', error);
    }
  };

  // Aufnahme starten
  const startRecording = async () => {
    if (!permissionGranted) {
      await requestMicrophonePermission();
      return;
    }

    if (mediaRecorderRef.current) {
      // Neue Session-ID für diese Aufnahme
      sessionIdRef.current = Date.now().toString();
      segmentIndexRef.current = 0;
      audioChunksRef.current = [];
      processingJobsRef.current.clear();
      setResults(null);
      
      mediaRecorderRef.current.start(1000); // Sammle Daten in 1s-Chunks
      setIsRecording(true);
      setRecordingTime(0);
      
      // Alle 5 Sekunden ein Segment erstellen und senden
      segmentIntervalRef.current = setInterval(async () => {
        if (mediaRecorderRef.current && isRecording) {
          // Aktuelles Segment anfordern
          mediaRecorderRef.current.requestData();
          
          // Segment an API senden
          if (audioChunksRef.current.length > 0) {
            const latestChunk = audioChunksRef.current[audioChunksRef.current.length - 1];
            const audioBlob = new Blob([latestChunk], { type: 'audio/webm' });
            await sendAudioToApi(audioBlob, segmentIndexRef.current);
            segmentIndexRef.current++;
          }
        }
      }, 5000);
    }
  };

  // Aufnahme stoppen
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Intervall clearing
      if (segmentIntervalRef.current) {
        clearInterval(segmentIntervalRef.current);
        segmentIntervalRef.current = null;
      }
      
      // Letztes Segment anfordern und senden
      mediaRecorderRef.current.requestData();
      
      // Aufnahme stoppen
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Finales Segment senden
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        sendAudioToApi(audioBlob, 'final');
      }
    }
  };

  // Formatierung der Aufnahmezeit
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Formatierung der Zeit für Anzeige
  const formatSegmentTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="flex flex-col justify-center items-center bg-[#111111] min-h-screen w-screen">
      <p className="text-white text-center pt-10 text-3xl font-semibold">Performance</p>
      <p className="text-white text-center mt-4 text-xl">AI doesn't forget, or get's annoyed</p>
      
      <div className="flex flex-col justify-center items-center w-2/4 bg-[#1a1a1a] mt-6 mb-auto p-6 rounded-lg shadow-lg border border-[#3a3a3a]">
        <div className="flex w-full justify-between text-center mb-8">
          <div className="flex items-center justify-center bg-[#111111] w-1/6 p-4 border border-[#464646] rounded-md">
            <div className={`w-4 h-4 rounded-full mr-2 ${isRecording ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <p className="font-semibold">{isRecording ? 'Aktiv' : 'Inaktiv'}</p>
          </div>
          
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`PX-12 bg-[#111111] w-2/6 p-4 rounded-md transition-all ${
              isRecording 
                ? 'text-green-400 border border-green-400 shadow-[0_0_5px_rgba(0,255,0,0.3)]' 
                : 'text-white hover:bg-[#1a1a1a]'
            }`}
          >
            {isRecording ? `Stop • ${formatTime(recordingTime)}` : 'Start Recording'}
          </button>
        </div>
        
        <div className="bg-[#111111] w-full p-4 border border-[#464646] rounded-md h-32">
          <canvas 
            ref={canvasRef} 
            width="600" 
            height="120"
            className="w-full h-full"
          />
        </div>

        {/* Ergebnisse der Stimmtrennung */}
        <div className="bg-[#111111] w-full p-4 border border-[#464646] rounded-md mt-4">
          <h3 className="text-white font-semibold mb-2">Erkannte Stimmen</h3>
          <div className="max-h-64 overflow-y-auto">
            {results && results.segments && results.segments.length > 0 ? (
              results.segments.map((segment, index) => (
                <div key={index} className="flex items-center mb-2 p-2 bg-[#1a1a1a] rounded">
                  <div 
                    className="w-4 h-4 rounded-full mr-3" 
                    style={{ backgroundColor: speakerColors[segment.speaker] || '#E3198A' }}
                  ></div>
                  <span className="text-white text-sm">
                    [{formatSegmentTime(segment.start)}-{formatSegmentTime(segment.end)}] 
                  </span>
                  <span className="text-white font-medium ml-2">{segment.speaker}:</span>
                  <span className="text-gray-300 ml-1">{segment.text || "(Keine Transkription)"}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">
                {isRecording ? "Analysiere Stimmen..." : "Starte Aufnahme, um Stimmen zu erkennen"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
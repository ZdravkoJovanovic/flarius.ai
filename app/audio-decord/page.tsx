'use client';

import { useState, useRef, useEffect } from 'react';

export default function AudioRecord() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

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
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.addEventListener('stop', () => {
        setIsRecording(false);
      });
      
    } catch (err) {
      console.error('Mikrofon-Zugriff verweigert:', err);
      alert('Mikrofon-Zugriff wurde verweigert. Bitte erlauben Sie den Zugriff.');
    }
  };

  // Aufnahme starten
  const startRecording = async () => {
    if (!permissionGranted) {
      await requestMicrophonePermission();
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    }
  };

  // Aufnahme stoppen
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
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
    }
  };

  // Formatierung der Aufnahmezeit
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      </div>
    </div>
  );
}
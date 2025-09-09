"use client";

import { useRef, useEffect, useState } from 'react';
import { FaArrowUp, FaExchangeAlt } from 'react-icons/fa';

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Zustände für den Chat-Input
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'learning' | 'exam'>('learning');
  const [maxLimitReached, setMaxLimitReached] = useState(false);
  const [messages, setMessages] = useState<{text: string, isUser: boolean}[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const MAX_HEIGHT = 120;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Canvas auf volle Containergröße setzen
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Kariertes Muster zeichnen
      drawGrid(context, canvas.width, canvas.height);
    };

    // Kariertes Muster zeichnen
    const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      ctx.fillStyle = '#000000'; // Schwarzer Hintergrund
      ctx.fillRect(0, 0, width, height);
      
      ctx.strokeStyle = '#333333'; // Dunkelgraue Linien
      ctx.lineWidth = 1;
      
      // Vertikale Linien
      for (let x = 0; x <= width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Horizontale Linien
      for (let y = 0; y <= height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    };

    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    
    window.addEventListener('resize', resizeCanvas);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Funktionen für das Whiteboard
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
    context.strokeStyle = '#FFFFFF'; // Weiße Zeichenfarbe
    context.lineWidth = 3;
    context.lineCap = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Funktionen für den Chat-Input
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !maxLimitReached) {
      // Benutzernachricht hinzufügen
      const userMessage = {text: inputValue, isUser: true};
      setMessages([...messages, userMessage]);
      
      // Nachricht an API-Route senden
      try {
        const response = await fetch('/api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: inputValue }),
        });
        
        if (response.ok) {
          console.log('Nachricht erfolgreich gesendet');
        }
      } catch (error) {
        console.error('Fehler beim Senden der Nachricht:', error);
      }
      
      // KI-Antwort simulieren (hier später mit echter KI-Integration ersetzen)
      setTimeout(() => {
        setMessages(prev => [...prev, {text: `Antwort auf: ${inputValue}`, isUser: false}]);
      }, 1000);
      
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setMaxLimitReached(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'learning' ? 'exam' : 'learning');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    if (maxLimitReached && newValue.length > inputValue.length) {
      return;
    }
    
    setInputValue(newValue);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      
      if (textareaRef.current.scrollHeight > MAX_HEIGHT) {
        textareaRef.current.style.height = `${MAX_HEIGHT}px`;
        setMaxLimitReached(true);
      } else {
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        setMaxLimitReached(false);
      }
    }
  }, [inputValue]);

  // Scroll zum Ende der Nachrichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="font-sans flex flex-col bg-black h-screen">
      {/* NavBar ohne Anmelden-Button */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <h1 className="text-2xl text-white font-semibold">Flarius</h1>
          {/* Anmelden-Button wurde entfernt */}
        </div>
      </nav>
      
      <div className="flex-1 relative pt-16 sm:pt-20">
        <div 
          ref={containerRef}
          className="absolute inset-0"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="absolute inset-0 cursor-crosshair touch-none"
          />
        </div>
        
        {/* Chat-Input als Overlay auf der rechten Seite */}
        <div className="absolute right-8 top-8 bottom-8 w-80 flex flex-col bg-[#151517] rounded-xl p-4">
          {/* Anmelden-Button im oberen Bereich des AI-Feldes - jetzt zentriert */}
          <div className="flex justify-center mb-4 border-b-2 border-gray-600 py-3">
            <a
              className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] dark:bg-white dark:text-black hover:text-white transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 w-full sm:h-12 px-4 sm:px-5"
              href="/login"
              rel="noopener noreferrer"
            >
              Anmelden
            </a>
          </div>
          
          {/* Nachrichten-Container mit unsichtbarer Scrollbar */}
          <div className="flex-1 overflow-y-auto mb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`mb-4 ${message.isUser ? 'text-right' : 'text-left'}`}
              >
                <div 
                  className={`inline-block p-3 rounded-lg max-w-xs ${
                    message.isUser 
                      ? 'bg-[#2c2c2e] text-white' 
                      : 'bg-[#1b1b1c] text-white'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Formular-Inhalt nach unten verschoben */}
          <div className="mt-auto">
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col w-full flex-grow mb-3">
                <textarea
                  ref={textareaRef}
                  id="input"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Wie kann Flarius dir helfen?"
                  className="bg-transparent text-white placeholder-gray-400 outline-none w-full resize-none min-h-[60px] font-sans"
                  rows={1}
                  style={{ overflow: 'hidden' }}
                />
              </div>
              
              {maxLimitReached && (
                <div className="text-red-400 text-sm mb-2 tracking-[-.01em] font-mono">
                  Maximale Zeichenlimit erreicht.
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                <span className="text-sm text-gray-300 font-sans">
                  {mode === 'learning' ? 'Lernmodus' : 'Prüfungsmodus'}
                </span>
                
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-700 transition-colors"
                  >
                    <FaExchangeAlt className="text-gray-300" />
                  </button>
                  
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || maxLimitReached}
                    className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <FaArrowUp className="text-gray-300" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
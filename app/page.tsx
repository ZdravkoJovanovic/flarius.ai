"use client"

import Image from "next/image";
import { useState, useRef, useEffect } from 'react';
import { FaArrowUp, FaExchangeAlt } from 'react-icons/fa';
import NavBar from './components/navbar'; // Pfad anpassen falls nötig

export default function Home() {
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'learning' | 'exam'>('learning');
  const [maxLimitReached, setMaxLimitReached] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_HEIGHT = 200; // Maximale Höhe in Pixel bevor Scrollen notwendig wird

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !maxLimitReached) {
      console.log('Eingabe gesendet:', inputValue);
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
    
    // Begrenzung der Eingabe, wenn Maximalhöhe erreicht ist
    if (maxLimitReached && newValue.length > inputValue.length) {
      return; // Verhindert weitere Eingabe, lässt aber Löschen zu
    }
    
    setInputValue(newValue);
  };

  useEffect(() => {
    if (textareaRef.current) {
      // Setze Höhe zurück, um die scrollHeight korrekt zu berechnen
      textareaRef.current.style.height = 'auto';
      
      // Begrenze die Höhe auf MAX_HEIGHT
      if (textareaRef.current.scrollHeight > MAX_HEIGHT) {
        textareaRef.current.style.height = `${MAX_HEIGHT}px`;
        setMaxLimitReached(true);
      } else {
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        setMaxLimitReached(false);
      }
    }
  }, [inputValue]);

  return (
    <div className="font-sans min-h-screen flex flex-col">
      {/* NavBar oben */}
      <NavBar />
      
      {/* Hauptinhalt zentriert */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-20 gap-16 sm:px-20">
        <main className="flex flex-col gap-[32px] items-center w-full max-w-3xl">
          <div className="flex w-full justify-center">
            {/* Eingabeleiste im DeepSeek-Stil - Finale Version */}
            <div className="w-full">
              <div className="w-full relative">
                <form 
                  onSubmit={handleSubmit}
                  className="flex flex-col bg-transparent rounded-xl p-4 border border-solid border-black/[.08] dark:border-white/[.145] transition-colors"
                >
                  {/* Eingabebereich */}
                  <div className="flex flex-col w-full flex-grow mb-3">
                    <textarea
                      ref={textareaRef}
                      id="input"
                      value={inputValue}
                      onChange={handleInputChange}
                      placeholder="Wie kann Flarius dir helfen?"
                      className="bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none w-full resize-none min-h-[60px] font-sans"
                      rows={1}
                      style={{ overflow: 'hidden' }}
                    />
                  </div>
                  
                  {/* Warnmeldung bei max Limit */}
                  {maxLimitReached && (
                    <div className="text-red-500 text-sm mb-2 tracking-[-.01em] font-mono">
                      Maximale Zeichenlimit erreicht. Sie können keine weiteren Zeichen eingeben.
                    </div>
                  )}
                  
                  {/* Untere Leiste mit Modusanzeige und Buttons */}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-sans">
                      {mode === 'learning' ? 'Lernmodus' : 'Prüfungsmodus'}
                    </span>
                    
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={toggleMode}
                        className="flex items-center justify-center h-10 w-10 rounded-full border border-solid border-black/[.08] dark:border-white/[.145] hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] transition-colors"
                        title={mode === 'learning' ? 'Zum Prüfungsmodus wechseln' : 'Zum Lernmodus wechseln'}
                      >
                        <FaExchangeAlt className="text-gray-600 dark:text-gray-300" />
                      </button>
                      
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || maxLimitReached}
                        className="flex items-center justify-center h-10 w-10 rounded-full border border-solid border-black/[.08] dark:border-white/[.145] hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Nachricht senden"
                      >
                        <FaArrowUp className="text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          
          <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left w-full">
            <li className="mb-2 tracking-[-.01em]">
              Get started by Uploading your notes{" "}
              <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">
                user/uploads
              </code>
              .
            </li>

            <li className="tracking-[-.01em] mb-2">
              Ask your questions about the content in the chat interface.
            </li>

            <li className="tracking-[-.01em]">
              Kick back. AI turns your notes into lessons and quizzes!
            </li>
          </ol>

          <div className="flex gap-4 items-center justify-center flex-col sm:flex-row w-full">
            <a
              className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                className="dark:invert"
                src="/vercel.svg"
                alt="Vercel logomark"
                width={20}
                height={20}
              />
              Join our waitlist
            </a>
            <a
              className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
              href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read our docs
            </a>
          </div>
        </main>
      </div>
      
      {/* Footer unten */}
      <footer className="flex gap-[24px] flex-wrap items-center justify-center py-8">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
      </footer>
    </div>
  );
}
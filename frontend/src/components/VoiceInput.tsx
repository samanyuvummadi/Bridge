import { useEffect, useRef, useState } from "react";

interface Props {
  onTranscript: (text: string) => void;
  language: "en" | "es";
  ariaLabel?: string;
}

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export default function VoiceInput({ onTranscript, language, ariaLabel }: Props) {
  const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
    };
  }, []);

  if (!SR) return null;

  const start = () => {
    try {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = language === "es" ? "es-MX" : "en-US";
      rec.onresult = (e: any) => {
        const text = e.results?.[0]?.[0]?.transcript ?? "";
        if (text) onTranscript(text);
      };
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const stop = () => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  };

  return (
    <button
      type="button"
      className={`bb-mic ${listening ? "bb-mic-listening" : ""}`}
      aria-label={ariaLabel || "Voice input"}
      aria-pressed={listening}
      onClick={listening ? stop : start}
    >
      {listening ? "■" : "🎙"}
    </button>
  );
}

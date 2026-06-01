'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Mic, Send, Sparkles, Square, Volume2, VolumeX, X } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { askAssistant, type AssistantMessage } from '@/lib/ai-api';

type SpeechRecognitionCtor = new () => SpeechRecognition;

type SpeechRecognitionEvent = Event & {
  results: {
    length: number;
    [index: number]: {
      length: number;
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};

export function AIAssistantFab() {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceEnabledRef = useRef(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      role: 'assistant',
      content: 'I am your CRM AI assistant. Ask about projects, follow-ups, activities, and performance.',
    },
  ]);

  const historyForApi = useMemo(
    () => messages.filter((msg) => msg.role === 'user' || msg.role === 'assistant').slice(-12),
    [messages],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ctor = (
      window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      }
    ).SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;

    if (!ctor) return;
    const recognition = new ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: Event) => {
      const speechEvent = event as SpeechRecognitionEvent;
      let transcript = '';
      for (let index = 0; index < speechEvent.results.length; index += 1) {
        transcript += speechEvent.results[index][0]?.transcript ?? '';
      }
      setInput(transcript.trim());
    };
    recognition.onerror = () => {
      setSpeechError('Voice input failed. Please allow microphone permission.');
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
    if (!voiceEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [voiceEnabled]);

  function toggleListening() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setSpeechError('Voice input is not supported in this browser.');
      return;
    }
    setSpeechError(null);
    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }
    recognition.start();
    setListening(true);
  }

  function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis || !voiceEnabledRef.current) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function toggleVoiceEnabled() {
    setVoiceEnabled((prev) => {
      const next = !prev;
      if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question || !token || loading) return;

    const nextMessages: AssistantMessage[] = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    try {
      const answer = await askAssistant(token, question, historyForApi);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
      speak(answer);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Failed to get response.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-[70] w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-pop overflow-hidden">
          <div className="h-12 px-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-brand-600" />
              AI Assistant
            </div>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={toggleVoiceEnabled}
                className="h-7 w-7 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-2)]"
                aria-label={voiceEnabled ? 'Mute assistant voice' : 'Enable assistant voice'}
                title={voiceEnabled ? 'Mute assistant voice' : 'Enable assistant voice'}
              >
                {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 inline-flex items-center justify-center rounded-lg hover:bg-[var(--surface-2)]"
                aria-label="Close AI assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[52vh] overflow-y-auto px-3 py-3 space-y-2 bg-[var(--surface-2)]/40">
            {messages.map((msg, index) => (
              <div
                key={`${msg.role}-${index}`}
                className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={
                    msg.role === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-tr-md bg-brand-600 text-white px-3 py-2 text-sm'
                      : 'max-w-[85%] rounded-2xl rounded-tl-md bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm whitespace-pre-line'
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && <p className="text-xs text-3 px-1">Thinking...</p>}
            {speechError && <p className="text-xs text-rose-600 px-1">{speechError}</p>}
          </div>

          <form onSubmit={(event) => void onSubmit(event)} className="p-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={listening ? 'soft' : 'secondary'}
                size="sm"
                onClick={toggleListening}
                className={listening ? 'bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-200' : undefined}
                title={listening ? 'Stop voice input' : 'Start voice input'}
              >
                {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </Button>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask, or tap mic. Example: log visit for Burj project..."
                className="h-10 flex-1 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:outline-none focus:border-[var(--border-strong)] text-sm"
              />
              <Button type="submit" variant="primary" size="sm" disabled={loading || !token || !input.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-20 right-4 z-[65] h-12 w-12 rounded-full bg-brand-600 text-white shadow-brand hover:bg-brand-700 inline-flex items-center justify-center"
        aria-label="Open AI assistant"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    </>
  );
}


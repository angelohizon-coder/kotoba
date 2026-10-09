import { useEffect, useRef, useState } from 'react';
import { Headphones, Play, Square, RotateCcw } from 'lucide-react';
import type { Listening } from '../types';

export default function AudioPlayer({ item, onFailure }: { item: Listening; onFailure?: () => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'playing' | 'missing' | 'error'>('loading');
  const [message, setMessage] = useState('Checking for a Japanese voice…');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const failRef = useRef(onFailure);
  failRef.current = onFailure;

  useEffect(() => {
    let live = true;
    const clearTimer = () => { if (timer.current) clearTimeout(timer.current); };
    if (item.audioUrl) {
      setStatus('ready'); setMessage('Supplied audio');
      return () => { live = false; clearTimer(); audioRef.current?.pause(); };
    }
    if (!('speechSynthesis' in window)) {
      setStatus('missing'); setMessage('Speech playback is unavailable in this browser. You can study the script instead.'); failRef.current?.();
      return;
    }
    const update = () => {
      if (!live) return;
      const japanese = window.speechSynthesis.getVoices().filter(v => /^ja(?:-|_|$)/i.test(v.lang));
      setVoices(japanese);
      if (japanese.length) { setStatus('ready'); setMessage('Japanese browser voice · text-to-speech practice'); }
    };
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    const discovery = setTimeout(() => {
      if (live && !window.speechSynthesis.getVoices().some(v => /^ja(?:-|_|$)/i.test(v.lang))) {
        setStatus('missing'); setMessage('No Japanese voice was found. Install a Japanese system voice or use script study.'); failRef.current?.();
      }
    }, 3000);
    return () => {
      live = false; clearTimer(); clearTimeout(discovery);
      window.speechSynthesis.removeEventListener('voiceschanged', update);
      if (utteranceRef.current) { utteranceRef.current.onend = null; utteranceRef.current.onerror = null; }
      window.speechSynthesis.cancel(); audioRef.current?.pause();
    };
  }, [item.id, item.audioUrl]);

  const fail = () => { if (timer.current) clearTimeout(timer.current); setStatus('error'); setMessage('Playback failed. Try again, or exclude this question from assessment.'); onFailure?.(); };
  const play = async () => {
    if (item.audioUrl && audioRef.current) {
      try { await audioRef.current.play(); setStatus('playing'); setMessage('Playing supplied audio…'); } catch { fail(); }
      return;
    }
    if (!('speechSynthesis' in window) || !voices.length) { fail(); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(item.script);
    utteranceRef.current = utterance;
    utterance.voice = voices[0]; utterance.lang = 'ja-JP'; utterance.rate = 0.9;
    let started = false;
    utterance.onstart = () => { started = true; if (timer.current) clearTimeout(timer.current); setStatus('playing'); setMessage('Playing Japanese text-to-speech…'); };
    utterance.onend = () => { if (timer.current) clearTimeout(timer.current); setStatus('ready'); setMessage('Finished · replay whenever you need'); };
    utterance.onerror = event => { if (!['interrupted', 'canceled'].includes(event.error)) fail(); };
    try {
      setMessage('Starting playback…');
      window.speechSynthesis.speak(utterance);
      timer.current = setTimeout(() => { if (!started) { window.speechSynthesis.cancel(); fail(); } }, 8000);
    } catch { fail(); }
  };
  const stop = () => { if (timer.current) clearTimeout(timer.current); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); audioRef.current?.pause(); setStatus(voices.length || item.audioUrl ? 'ready' : 'missing'); setMessage('Playback stopped'); };

  return <div className="audio-player">
    <div className="inline-actions"><Headphones size={22} /><strong>{item.audioUrl ? 'Audio practice' : 'Browser speech practice'}</strong><span className="badge">{item.audioUrl ? 'Audio' : 'Text-to-speech'}</span></div>
    <p className="audio-status" role="status">{message}</p>
    {item.audioUrl && <audio ref={audioRef} src={item.audioUrl} onError={fail} onEnded={() => { setStatus('ready'); setMessage('Finished · replay whenever you need'); }} />}
    <div className="inline-actions"><button className="button primary small" onClick={play} disabled={status === 'loading' || status === 'missing'}><Play size={16} />{status === 'error' ? 'Retry playback' : 'Play / replay'}</button><button className="button secondary small" onClick={stop} disabled={status !== 'playing'}><Square size={15} />Stop</button>{status === 'error' && <span className="muted"><RotateCcw size={14} /> A playback issue won’t reduce your score.</span>}</div>
  </div>;
}

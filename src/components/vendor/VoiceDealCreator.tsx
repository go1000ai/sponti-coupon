'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, Sparkles, RotateCcw, Volume2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface VoiceDealResult {
  title: string;
  description: string;
  deal_type: 'regular' | 'sponti_coupon';
  original_price: number;
  deal_price: number;
  deposit_amount: number;
  max_claims: number;
  duration_hours: number;
  duration_days: number;
  highlights: string[];
  fine_print: string;
  terms_and_conditions: string;
  search_tags: string[];
  image_prompt: string;
}

interface VoiceDealCreatorProps {
  onDealParsed: (deal: VoiceDealResult) => void;
  vendorId?: string;
}

export default function VoiceDealCreator({ onDealParsed, vendorId }: VoiceDealCreatorProps) {
  const { locale } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    setError('');
    setTranscript('');
    setInterimTranscript('');

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalText = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalText.trim());
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const handleProcess = useCallback(async () => {
    const text = transcript.trim();
    if (text.length < 5) {
      setError('Please describe your deal in more detail.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/vendor/ava-voice-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          locale,
          ...(vendorId && { vendor_id: vendorId }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to process voice input');
        return;
      }

      onDealParsed(data);
      setTranscript('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setProcessing(false);
    }
  }, [transcript, vendorId, onDealParsed]);

  const handleReset = useCallback(() => {
    stopListening();
    setTranscript('');
    setInterimTranscript('');
    setError('');
  }, [stopListening]);

  if (!supported) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-700 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary-50 to-orange-50 border border-primary-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary-500" />
        <h3 className="font-semibold text-gray-900">Voice Deal Creator</h3>
        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
          Powered by Ava
        </span>
      </div>

      <p className="text-sm text-gray-600">
        Describe your deal out loud and Ava will fill in all the details for you — title, pricing, description, tags, and even generate an image.
      </p>

      {/* Mic button + status */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={processing}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
              : 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isListening ? (
            <>
              <MicOff className="w-6 h-6" />
              {/* Pulsing ring animation */}
              <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />
            </>
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>

        <div className="flex-1">
          {isListening ? (
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-600">Listening... Tap the mic to stop</span>
            </div>
          ) : transcript ? (
            <span className="text-sm text-gray-600">Recording complete. Review or process below.</span>
          ) : (
            <span className="text-sm text-gray-500">
              Tap the mic and describe your deal. Example: &quot;I want to offer 30% off our signature massage, originally $80, as a flash deal for today&quot;
            </span>
          )}
        </div>
      </div>

      {/* Live transcript */}
      {(transcript || interimTranscript) && (
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Transcript</label>
          <p className="text-sm text-gray-900 leading-relaxed">
            {transcript}
            {interimTranscript && (
              <span className="text-gray-400 italic">{interimTranscript}</span>
            )}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons */}
      {transcript && !isListening && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleProcess}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium text-sm transition-colors"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ava is working...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Create Deal with Ava
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={processing}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}

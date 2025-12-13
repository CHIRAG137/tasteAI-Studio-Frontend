import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechToTextProps {
  onResult: (text: string) => void;
  onError: (error: string) => void;
  language?: string;
  silenceTimeout?: number; // seconds of silence before warning
  stopTimeout?: number; // additional seconds before auto-stop
}

export const useSpeechToText = ({
  onResult,
  onError,
  language = 'en-US',
  silenceTimeout = 10,
  stopTimeout = 5,
}: UseSpeechToTextProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSilenceWarning, setShowSilenceWarning] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (silenceCheckIntervalRef.current) {
      clearInterval(silenceCheckIntervalRef.current);
      silenceCheckIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setShowSilenceWarning(false);
  }, []);

  // Send audio to backend for transcription
  const sendAudioToBackend = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/elevenlabs/speech-to-text`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const data = await response.json();
      
      if (data.result?.text) {
        onResult(data.result.text);
      } else {
        throw new Error('No transcription text received');
      }
    } catch (error: any) {
      console.error('Speech-to-text error:', error);
      onError(error.message || 'Failed to transcribe audio');
    } finally {
      setIsProcessing(false);
    }
  }, [onResult, onError]);

  // Stop recording and process audio
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    return new Promise<void>((resolve) => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            audioChunksRef.current = [];
            
            // Send to backend
            await sendAudioToBackend(audioBlob);
          }
          
          cleanup();
          setIsListening(false);
          resolve();
        };

        mediaRecorderRef.current.stop();
      }
    });
  }, [cleanup, sendAudioToBackend]);

  // Detect silence using audio analysis
  const checkForSilence = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const threshold = 10; // Silence threshold (adjust as needed)

    if (average < threshold) {
      // User is silent
      if (!silenceTimerRef.current && !showSilenceWarning) {
        // Start silence timer
        silenceTimerRef.current = setTimeout(() => {
          setShowSilenceWarning(true);
          onError('Please speak into the microphone...');
          
          // Start stop timer
          stopTimerRef.current = setTimeout(() => {
            stopRecording();
          }, stopTimeout * 1000);
        }, silenceTimeout * 1000);
      }
    } else {
      // User is speaking - reset timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      setShowSilenceWarning(false);
    }
  }, [silenceTimeout, stopTimeout, showSilenceWarning, stopRecording, onError]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio context for silence detection
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsListening(true);

      // Start checking for silence every 500ms
      silenceCheckIntervalRef.current = setInterval(checkForSilence, 500);

    } catch (error: any) {
      console.error('Microphone access error:', error);
      onError(error.message || 'Failed to access microphone');
      cleanup();
    }
  }, [checkForSilence, onError, cleanup]);

  // Toggle recording
  const toggleListening = useCallback(async () => {
    if (isListening) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isListening, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    isProcessing,
    showSilenceWarning,
    toggleListening,
    stopRecording,
  };
};
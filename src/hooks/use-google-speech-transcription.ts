"use client";

import { useState, useRef, useCallback } from "react";

export type GoogleSpeechState = "idle" | "connecting" | "recording" | "error";

interface UseGoogleSpeechTranscriptionReturn {
  state: GoogleSpeechState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
}

const SAMPLE_RATE = 16000;
const WS_URL = process.env.NEXT_PUBLIC_SPEECH_WS_URL || "ws://localhost:3001";

export function useGoogleSpeechTranscription(): UseGoogleSpeechTranscriptionReturn {
  const [state, setState] = useState<GoogleSpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setState("connecting");

      // Connect to WebSocket server
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 48000,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            },
          });

          streamRef.current = stream;

          const audioContext = new AudioContext({ sampleRate: 48000 });
          audioContextRef.current = audioContext;

          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const audioData = e.inputBuffer.getChannelData(0);

              // Downsample from 48kHz to 16kHz
              const ratio = 48000 / SAMPLE_RATE;
              const newLength = Math.round(audioData.length / ratio);
              const downsampled = new Float32Array(newLength);
              for (let i = 0; i < newLength; i++) {
                downsampled[i] = audioData[Math.round(i * ratio)];
              }

              // Convert to Int16
              const int16 = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) {
                const s = Math.max(-1, Math.min(1, downsampled[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }

              // Send as binary
              ws.send(int16.buffer);
            }
          };

          source.connect(processor);
          processor.connect(audioContext.destination);

          setState("recording");
        } catch (err) {
          if (err instanceof Error && err.name === "NotAllowedError") {
            setError("マイクへのアクセスが拒否されました");
          } else {
            setError(
              err instanceof Error ? err.message : "録音を開始できませんでした"
            );
          }
          setState("error");
          cleanup();
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "interim":
              setInterimTranscript(data.transcript);
              break;
            case "final":
              if (data.transcript) {
                setTranscript((prev) =>
                  prev ? `${prev}\n${data.transcript}` : data.transcript
                );
                setInterimTranscript("");
              }
              break;
            case "error":
              console.error("Speech recognition error:", data.error);
              setError(data.error);
              break;
          }
        } catch (err) {
          console.error("Failed to parse message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket接続エラー");
        setState("error");
        cleanup();
      };

      ws.onclose = () => {
        setState((currentState) =>
          currentState === "recording" || currentState === "connecting"
            ? "idle"
            : currentState
        );
      };
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(
        err instanceof Error ? err.message : "録音を開始できませんでした"
      );
      setState("error");
      cleanup();
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    cleanup();
    setState("idle");
    setInterimTranscript("");
  }, [cleanup]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    state,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}

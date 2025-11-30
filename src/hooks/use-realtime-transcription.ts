"use client";

import { useState, useRef, useCallback } from "react";
import { processAudioForRealtime } from "@/lib/audio-utils";

export type RealtimeState =
  | "idle"
  | "connecting"
  | "connected"
  | "recording"
  | "error";

interface UseRealtimeTranscriptionReturn {
  state: RealtimeState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
}

const REALTIME_URL = "wss://api.openai.com/v1/realtime?intent=transcription";
const SAMPLE_RATE = 24000;

export function useRealtimeTranscription(): UseRealtimeTranscriptionReturn {
  const [state, setState] = useState<RealtimeState>("idle");
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
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setState("connecting");

      // Get ephemeral token from server
      const tokenResponse = await fetch("/api/ai/realtime-token", {
        method: "POST",
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get realtime token");
      }

      const { client_secret } = await tokenResponse.json();
      if (!client_secret?.value) {
        throw new Error("Invalid token response");
      }

      // Connect to OpenAI Realtime API
      const ws = new WebSocket(REALTIME_URL, [
        "realtime",
        `openai-insecure-api-key.${client_secret.value}`,
        "openai-beta.realtime-v1",
      ]);

      wsRef.current = ws;

      ws.onopen = async () => {
        setState("connected");

        // Configure the session for transcription
        ws.send(
          JSON.stringify({
            type: "transcription_session.update",
            session: {
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: "gpt-4o-mini-transcribe",
                language: "ja",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
            },
          })
        );

        // Start capturing audio
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
              const base64Audio = processAudioForRealtime(
                audioData,
                48000,
                SAMPLE_RATE
              );

              ws.send(
                JSON.stringify({
                  type: "input_audio_buffer.append",
                  audio: base64Audio,
                })
              );
            }
          };

          source.connect(processor);
          processor.connect(audioContext.destination);

          setState("recording");
        } catch (err) {
          if (err instanceof Error && err.name === "NotAllowedError") {
            throw new Error("Microphone access denied");
          }
          throw err;
        }
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case "conversation.item.input_audio_transcription.delta":
            // Interim transcription
            setInterimTranscript((prev) => prev + (message.delta || ""));
            break;

          case "conversation.item.input_audio_transcription.completed":
            // Final transcription for this segment
            if (message.transcript) {
              setTranscript((prev) =>
                prev ? `${prev}\n${message.transcript}` : message.transcript
              );
              setInterimTranscript("");
            }
            break;

          case "error":
            console.error("Realtime API error:", message.error);
            setError(message.error?.message || "Unknown error");
            break;
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
        setState("error");
        cleanup();
      };

      ws.onclose = () => {
        if (state === "recording") {
          setState("idle");
        }
      };
    } catch (err) {
      console.error("Error starting realtime transcription:", err);
      setError(err instanceof Error ? err.message : "Failed to start");
      setState("error");
      cleanup();
    }
  }, [cleanup, state]);

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

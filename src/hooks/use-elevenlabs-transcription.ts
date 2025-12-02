"use client";

import { useState, useRef, useCallback } from "react";

export type ElevenLabsState = "idle" | "connecting" | "recording" | "error";

interface UseElevenLabsTranscriptionReturn {
  state: ElevenLabsState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
}

const SAMPLE_RATE = 16000;

export function useElevenLabsTranscription(): UseElevenLabsTranscriptionReturn {
  const [state, setState] = useState<ElevenLabsState>("idle");
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

      // Get single-use token from server
      const tokenResponse = await fetch("/api/ai/elevenlabs-token", {
        method: "POST",
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get ElevenLabs token");
      }

      const { token } = await tokenResponse.json();
      if (!token) {
        throw new Error("Invalid token response");
      }

      // Connect to ElevenLabs WebSocket with token
      const wsUrl = new URL(
        "wss://api.elevenlabs.io/v1/speech-to-text/realtime"
      );
      wsUrl.searchParams.set("model_id", "scribe_v2_realtime");
      wsUrl.searchParams.set("token", token);
      wsUrl.searchParams.set("language_code", "ja");

      console.log("Connecting to ElevenLabs WebSocket...");

      const ws = new WebSocket(wsUrl.toString());
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log("ElevenLabs WebSocket connected");

        try {
          // Get microphone access
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

              // Convert to Int16 PCM
              const int16 = new Int16Array(downsampled.length);
              for (let i = 0; i < downsampled.length; i++) {
                const s = Math.max(-1, Math.min(1, downsampled[i]));
                int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }

              // Convert to base64
              const base64 = btoa(
                String.fromCharCode(...new Uint8Array(int16.buffer))
              );

              // Send audio chunk
              ws.send(
                JSON.stringify({
                  message_type: "input_audio_chunk",
                  audio_base_64: base64,
                  sample_rate: SAMPLE_RATE,
                })
              );
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
          console.log("ElevenLabs message:", data.message_type, data);

          switch (data.message_type) {
            case "session_started":
              console.log("ElevenLabs session started");
              break;

            case "partial_transcript":
              if (data.text) {
                setInterimTranscript(data.text);
              }
              break;

            case "final_transcript":
            case "committed_transcript":
              if (data.text) {
                setTranscript((prev) =>
                  prev ? `${prev}\n${data.text}` : data.text
                );
                setInterimTranscript("");
              }
              break;

            case "error":
              console.error("ElevenLabs error:", data);
              setError(data.error || "認識エラー");
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

      ws.onclose = (event) => {
        console.log("ElevenLabs WebSocket closed:", event.code, event.reason);
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

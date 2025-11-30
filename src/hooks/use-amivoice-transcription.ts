"use client";

import { useState, useRef, useCallback } from "react";

export type AmiVoiceState = "idle" | "connecting" | "recording" | "error";

interface UseAmiVoiceTranscriptionReturn {
  state: AmiVoiceState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearTranscript: () => void;
}

const AMIVOICE_WS_URL = "wss://acp-api.amivoice.com/v1/nolog/";
const SAMPLE_RATE = 16000;

export function useAmiVoiceTranscription(): UseAmiVoiceTranscriptionReturn {
  const [state, setState] = useState<AmiVoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isSessionStartedRef = useRef(false);

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
      if (
        wsRef.current.readyState === WebSocket.OPEN &&
        isSessionStartedRef.current
      ) {
        // Send end command
        wsRef.current.send("e");
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    isSessionStartedRef.current = false;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setState("connecting");

      // Get one-time APPKEY from server
      const tokenResponse = await fetch("/api/ai/amivoice-token", {
        method: "POST",
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to get AmiVoice token");
      }

      const { appkey } = await tokenResponse.json();
      if (!appkey) {
        throw new Error("Invalid token response");
      }

      // Connect to AmiVoice WebSocket
      const ws = new WebSocket(AMIVOICE_WS_URL);
      wsRef.current = ws;

      ws.onopen = async () => {
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

          // Send start command
          // Format: "s <audio_format> <engine> authorization=<appkey>"
          // 16K = 16kHz, 16bit, mono, little-endian, raw PCM
          const startCommand = `s 16K -a-general authorization=${appkey}`;
          ws.send(startCommand);
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
        const message = event.data as string;
        console.log("AmiVoice raw message:", message);

        // Handle s command response
        if (message === "s") {
          console.log("AmiVoice session started");
          isSessionStartedRef.current = true;
          startAudioCapture(ws);
          setState("recording");
          return;
        }

        // Handle e command response
        if (message === "e") {
          console.log("AmiVoice session ended");
          isSessionStartedRef.current = false;
          return;
        }

        // U event: interim results (format: "U {json}")
        if (message.startsWith("U ") || message.startsWith("U{")) {
          try {
            const jsonStr = message.startsWith("U ") ? message.slice(2) : message.slice(1);
            const json = JSON.parse(jsonStr);
            console.log("Interim result:", json.text);
            if (json.text) {
              setInterimTranscript(json.text);
            }
          } catch (e) {
            console.error("Failed to parse U event:", e, message);
          }
          return;
        }

        // A event: final results (format: "A {json}")
        if (message.startsWith("A ") || message.startsWith("A{")) {
          try {
            const jsonStr = message.startsWith("A ") ? message.slice(2) : message.slice(1);
            const json = JSON.parse(jsonStr);
            console.log("Final result:", json.text);
            if (json.text) {
              setTranscript((prev) =>
                prev ? `${prev}\n${json.text}` : json.text
              );
              setInterimTranscript("");
            }
          } catch (e) {
            console.error("Failed to parse A event:", e, message);
          }
          return;
        }

        // S event: speech start detected
        if (message.startsWith("S")) {
          console.log("Speech start detected");
          return;
        }

        // E event: speech end detected
        if (message.startsWith("E")) {
          console.log("Speech end detected");
          return;
        }

        // C event: processing started
        if (message.startsWith("C")) {
          console.log("Processing started");
          return;
        }

        // Try to parse as JSON for error responses
        try {
          const data = JSON.parse(message);
          if (data.code && data.code !== "" && data.code !== "-") {
            console.error("AmiVoice error:", data.message);
            setError(data.message || "認識エラー");
          }
        } catch {
          console.log("AmiVoice other message:", message);
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

  const startAudioCapture = useCallback((ws: WebSocket) => {
    const stream = streamRef.current;
    if (!stream) return;

    const audioContext = new AudioContext({ sampleRate: 48000 });
    audioContextRef.current = audioContext;

    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState === WebSocket.OPEN && isSessionStartedRef.current) {
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

        // Send as binary with 'p' prefix
        // AmiVoice expects: 0x70 ('p') + raw PCM data
        const buffer = new ArrayBuffer(1 + int16.byteLength);
        const view = new DataView(buffer);
        view.setUint8(0, 0x70); // 'p' command
        new Uint8Array(buffer, 1).set(new Uint8Array(int16.buffer));

        ws.send(buffer);
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  }, []);

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

"use client";

import { useState, useCallback } from "react";
import { useAudioRecorder } from "./use-audio-recorder";

export interface TranscriptSegment {
  id: number;
  text: string;
  start: number;
  end: number;
}

interface UseTranscriptionReturn {
  isRecording: boolean;
  isPaused: boolean;
  isProcessing: boolean;
  transcript: string;
  segments: TranscriptSegment[];
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearTranscript: () => void;
}

export function useTranscription(): UseTranscriptionReturn {
  const [transcript, setTranscript] = useState("");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTranscriptionError(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Transcription failed");
      }

      const data = await response.json();

      setTranscript((prev) => (prev ? `${prev}\n${data.text}` : data.text));

      if (data.segments) {
        const newSegments: TranscriptSegment[] = data.segments.map(
          (seg: { id: number; text: string; start: number; end: number }) => ({
            id: seg.id,
            text: seg.text,
            start: seg.start,
            end: seg.end,
          })
        );
        setSegments((prev) => [...prev, ...newSegments]);
      }
    } catch (err) {
      setTranscriptionError(
        err instanceof Error ? err.message : "Transcription failed"
      );
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const audioRecorder = useAudioRecorder({
    onAudioChunk: transcribeAudio,
    chunkInterval: 10000, // Send audio every 10 seconds for real-time-ish transcription
  });

  const handleStopRecording = useCallback(async () => {
    const audioBlob = await audioRecorder.stopRecording();
    if (audioBlob && audioBlob.size > 0) {
      await transcribeAudio(audioBlob);
    }
  }, [audioRecorder, transcribeAudio]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setSegments([]);
    setTranscriptionError(null);
  }, []);

  return {
    isRecording: audioRecorder.state === "recording",
    isPaused: audioRecorder.state === "paused",
    isProcessing: isProcessing || audioRecorder.state === "processing",
    transcript,
    segments,
    error: audioRecorder.error || transcriptionError,
    startRecording: audioRecorder.startRecording,
    stopRecording: handleStopRecording,
    pauseRecording: audioRecorder.pauseRecording,
    resumeRecording: audioRecorder.resumeRecording,
    clearTranscript,
  };
}

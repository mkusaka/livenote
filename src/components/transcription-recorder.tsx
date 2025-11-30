"use client";

import { useTranscription } from "@/hooks/use-transcription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Pause, Play, Trash2 } from "lucide-react";

interface TranscriptionRecorderProps {
  onTranscriptChange?: (transcript: string) => void;
}

export function TranscriptionRecorder({
  onTranscriptChange,
}: TranscriptionRecorderProps) {
  const {
    isRecording,
    isPaused,
    isProcessing,
    transcript,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearTranscript,
  } = useTranscription();

  const handleTranscriptChange = (newTranscript: string) => {
    onTranscriptChange?.(newTranscript);
  };

  // Notify parent when transcript changes
  if (transcript && onTranscriptChange) {
    handleTranscriptChange(transcript);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recording</span>
          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="flex items-center gap-2 text-sm font-normal text-red-500">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Recording
              </span>
            )}
            {isPaused && (
              <span className="text-sm font-normal text-yellow-500">
                Paused
              </span>
            )}
            {isProcessing && (
              <span className="text-sm font-normal text-blue-500">
                Processing...
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {!isRecording && !isPaused ? (
            <Button
              onClick={startRecording}
              disabled={isProcessing}
              className="flex-1"
            >
              <Mic className="mr-2 h-4 w-4" />
              Start Recording
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button onClick={resumeRecording} variant="outline">
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </Button>
              ) : (
                <Button onClick={pauseRecording} variant="outline">
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </Button>
              )}
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="flex-1"
              >
                <MicOff className="mr-2 h-4 w-4" />
                Stop Recording
              </Button>
            </>
          )}

          {transcript && !isRecording && !isPaused && (
            <Button onClick={clearTranscript} variant="ghost" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {transcript && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Transcript</h4>
            <div className="p-4 bg-muted rounded-md max-h-64 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{transcript}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useEffect } from "react";
import { useRealtimeTranscription } from "@/hooks/use-realtime-transcription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Trash2, Wifi, WifiOff } from "lucide-react";

interface RealtimeTranscriptionRecorderProps {
  onTranscriptChange?: (transcript: string) => void;
}

export function RealtimeTranscriptionRecorder({
  onTranscriptChange,
}: RealtimeTranscriptionRecorderProps) {
  const {
    state,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useRealtimeTranscription();

  // Notify parent when transcript changes
  useEffect(() => {
    if (transcript) {
      onTranscriptChange?.(transcript);
    }
  }, [transcript, onTranscriptChange]);

  const isRecording = state === "recording";
  const isConnecting = state === "connecting" || state === "connected";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recording</span>
          <div className="flex items-center gap-2">
            {state === "connecting" && (
              <span className="flex items-center gap-2 text-sm font-normal text-yellow-500">
                <Wifi className="h-4 w-4 animate-pulse" />
                Connecting...
              </span>
            )}
            {state === "connected" && (
              <span className="flex items-center gap-2 text-sm font-normal text-blue-500">
                <Wifi className="h-4 w-4" />
                Connected
              </span>
            )}
            {isRecording && (
              <span className="flex items-center gap-2 text-sm font-normal text-red-500">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Recording
              </span>
            )}
            {state === "error" && (
              <span className="flex items-center gap-2 text-sm font-normal text-red-500">
                <WifiOff className="h-4 w-4" />
                Error
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
          {!isRecording && !isConnecting ? (
            <Button onClick={startRecording} className="flex-1">
              <Mic className="mr-2 h-4 w-4" />
              Start Recording
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="flex-1"
            >
              <MicOff className="mr-2 h-4 w-4" />
              Stop Recording
            </Button>
          )}

          {transcript && !isRecording && !isConnecting && (
            <Button onClick={clearTranscript} variant="ghost" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {(transcript || interimTranscript) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Transcript</h4>
            <div className="p-4 bg-muted rounded-md max-h-64 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">
                {transcript}
                {interimTranscript && (
                  <span className="text-muted-foreground">
                    {transcript ? " " : ""}
                    {interimTranscript}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Real-time transcription powered by OpenAI Realtime API
        </p>
      </CardContent>
    </Card>
  );
}

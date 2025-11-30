"use client";

import { useEffect } from "react";
import { useAmiVoiceTranscription } from "@/hooks/use-amivoice-transcription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Trash2 } from "lucide-react";

interface AmiVoiceRecorderProps {
  onTranscriptChange?: (transcript: string) => void;
}

export function AmiVoiceRecorder({
  onTranscriptChange,
}: AmiVoiceRecorderProps) {
  const {
    state,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useAmiVoiceTranscription();

  // Notify parent when transcript changes
  useEffect(() => {
    if (transcript) {
      onTranscriptChange?.(transcript);
    }
  }, [transcript, onTranscriptChange]);

  const isRecording = state === "recording";
  const isConnecting = state === "connecting";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recording (AmiVoice)</span>
          <div className="flex items-center gap-2">
            {isConnecting && (
              <span className="flex items-center gap-2 text-sm font-normal text-yellow-500">
                接続中...
              </span>
            )}
            {isRecording && (
              <span className="flex items-center gap-2 text-sm font-normal text-red-500">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                録音中
              </span>
            )}
            {state === "error" && (
              <span className="flex items-center gap-2 text-sm font-normal text-red-500">
                エラー
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
              録音開始
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="flex-1"
            >
              <MicOff className="mr-2 h-4 w-4" />
              録音停止
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
            <h4 className="text-sm font-medium">文字起こし</h4>
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
          AmiVoice Cloud Platform API を使用
        </p>
      </CardContent>
    </Card>
  );
}

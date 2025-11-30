"use client";

import { useState } from "react";
import Link from "next/link";
import { RealtimeTranscriptionRecorder } from "@/components/realtime-transcription-recorder";
import { GoogleSpeechRecorder } from "@/components/google-speech-recorder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Sparkles } from "lucide-react";

type SpeechProvider = "openai" | "google";

interface ExtractedTopic {
  title: string;
  summary: string;
}

interface ExtractedData {
  keywords: string[];
  topics: ExtractedTopic[];
}

export default function NewConversationPage() {
  const [transcript, setTranscript] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(
    null
  );
  const [isExtracting, setIsExtracting] = useState(false);
  const [provider, setProvider] = useState<SpeechProvider>("google");

  const handleExtractTopics = async () => {
    if (!transcript) return;

    setIsExtracting(true);
    try {
      const response = await fetch("/api/ai/extract-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: transcript }),
      });

      if (response.ok) {
        const data = await response.json();
        setExtractedData(data);
      }
    } catch (error) {
      console.error("Failed to extract topics:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">New Conversation</h1>
        </div>

        <div className="mb-4">
          <Select
            value={provider}
            onValueChange={(value: SpeechProvider) => setProvider(value)}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="音声認識プロバイダー" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google">Google Cloud Speech-to-Text</SelectItem>
              <SelectItem value="openai">OpenAI Realtime API</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            {provider === "google" ? (
              <GoogleSpeechRecorder onTranscriptChange={setTranscript} />
            ) : (
              <RealtimeTranscriptionRecorder onTranscriptChange={setTranscript} />
            )}

            {transcript && (
              <Button
                onClick={handleExtractTopics}
                disabled={isExtracting}
                className="w-full"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isExtracting ? "Extracting..." : "Extract Topics"}
              </Button>
            )}
          </div>

          <div className="space-y-6">
            {extractedData && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Keywords</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {extractedData.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Topics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {extractedData.topics.map((topic, index) => (
                      <div key={index} className="space-y-1">
                        <h4 className="font-medium">{topic.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {topic.summary}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            {!extractedData && transcript && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Click &quot;Extract Topics&quot; to analyze the conversation
                </CardContent>
              </Card>
            )}

            {!transcript && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Start recording to see extracted topics here
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

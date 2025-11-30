import "dotenv/config";
import { WebSocketServer, WebSocket } from "ws";
import { SpeechClient } from "@google-cloud/speech";
import type { google } from "@google-cloud/speech/build/protos/protos";
import type { Writable } from "stream";
import * as fs from "fs";

const PORT = parseInt(process.env.SPEECH_WS_PORT || "3001", 10);

let speechClient: SpeechClient | null = null;

function getSpeechClient(): SpeechClient {
  if (!speechClient) {
    // Priority: GOOGLE_APPLICATION_CREDENTIALS_JSON > GOOGLE_APPLICATION_CREDENTIALS file
    const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (credentialsJson) {
      console.log("Using credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON");
      const credentials = JSON.parse(credentialsJson);
      console.log("Project ID:", credentials.project_id);
      speechClient = new SpeechClient({ credentials });
    } else if (credentialsPath && fs.existsSync(credentialsPath)) {
      console.log("Using credentials from file:", credentialsPath);
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
      console.log("Project ID:", credentials.project_id);
      speechClient = new SpeechClient({ credentials });
    } else {
      console.log("Using default credentials (ADC)");
      speechClient = new SpeechClient();
    }
  }
  return speechClient;
}

const wss = new WebSocketServer({ port: PORT });

console.log(`Speech WebSocket server running on ws://localhost:${PORT}`);

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  const client = getSpeechClient();
  let recognizeStream: Writable | null = null;
  let isStreamActive = false;

  const request: google.cloud.speech.v1.IStreamingRecognitionConfig = {
    config: {
      encoding: "LINEAR16",
      sampleRateHertz: 16000,
      languageCode: "ja-JP",
      enableAutomaticPunctuation: true,
      model: "latest_long",
    },
    interimResults: true,
  };

  function createRecognizeStream() {
    if (recognizeStream) {
      recognizeStream.end();
    }

    isStreamActive = true;
    recognizeStream = client
      .streamingRecognize(request)
      .on("error", (error) => {
        console.error("Speech recognition error:", error.message);
        isStreamActive = false;
        // Don't send error to client for stream timeout - just recreate
        if (!error.message.includes("stream")) {
          ws.send(JSON.stringify({ type: "error", error: error.message }));
        }
      })
      .on("data", (data: google.cloud.speech.v1.IStreamingRecognizeResponse) => {
        const result = data.results?.[0];
        if (result && ws.readyState === WebSocket.OPEN) {
          const transcript = result.alternatives?.[0]?.transcript || "";
          const isFinal = result.isFinal || false;

          ws.send(
            JSON.stringify({
              type: isFinal ? "final" : "interim",
              transcript,
            })
          );
        }
      })
      .on("end", () => {
        console.log("Recognition stream ended, will recreate on next audio");
        isStreamActive = false;
      });

    return recognizeStream;
  }

  // Create initial stream
  createRecognizeStream();

  ws.on("message", (message: Buffer) => {
    try {
      // Check if it's a control message (JSON)
      const messageStr = message.toString();
      if (messageStr.startsWith("{")) {
        const data = JSON.parse(messageStr);
        if (data.type === "stop") {
          if (recognizeStream) {
            recognizeStream.end();
            recognizeStream = null;
          }
          isStreamActive = false;
          return;
        }
      }

      // Recreate stream if it was closed
      if (!isStreamActive || !recognizeStream) {
        console.log("Recreating recognition stream");
        createRecognizeStream();
      }

      // Write audio data to stream
      if (recognizeStream && isStreamActive) {
        recognizeStream.write(message);
      }
    } catch {
      // Binary audio data - recreate stream if needed
      if (!isStreamActive || !recognizeStream) {
        console.log("Recreating recognition stream");
        createRecognizeStream();
      }

      if (recognizeStream && isStreamActive) {
        recognizeStream.write(message);
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
    isStreamActive = false;
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
    isStreamActive = false;
  });
});

process.on("SIGINT", () => {
  console.log("Shutting down...");
  wss.close();
  process.exit(0);
});

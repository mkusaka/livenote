import { NextResponse } from "next/server";

/**
 * Generate an ephemeral token for OpenAI Realtime API (Transcription mode)
 * This allows the browser to connect directly to OpenAI without exposing the API key
 *
 * Uses the transcription_sessions endpoint for speech-to-text only
 * @see https://platform.openai.com/docs/api-reference/realtime-beta-sessions
 */
export async function POST() {
  try {
    // Use the transcription-specific endpoint
    const response = await fetch(
      "https://api.openai.com/v1/realtime/transcription_sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input_audio_format: "pcm16",
          input_audio_transcription: {
            model: "gpt-4o-mini-transcribe",
            language: "ja",
          },
          input_audio_noise_reduction: {
            type: "near_field",
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create realtime session:", error);
      return NextResponse.json(
        { error: "Failed to create realtime session" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating realtime session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

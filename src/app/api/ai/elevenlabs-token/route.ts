import { NextResponse } from "next/server";

/**
 * Generate a single-use token for ElevenLabs Realtime Speech-to-Text
 * This allows the browser to connect directly to ElevenLabs without exposing API key
 *
 * Token expires after 15 minutes
 *
 * @see https://elevenlabs.io/docs/api-reference/single-use/create
 */
export async function POST() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create ElevenLabs token:", error);
      return NextResponse.json(
        { error: "Failed to create token" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error("Error creating ElevenLabs token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

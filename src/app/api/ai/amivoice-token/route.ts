import { NextResponse } from "next/server";

/**
 * Generate a one-time APPKEY for AmiVoice API
 * This allows the browser to connect directly to AmiVoice without exposing credentials
 *
 * Requires AMIVOICE_APPKEY with "can issue APPKEY" permission
 *
 * @see https://docs.amivoice.com/amivoice-api/manual/reference-one-time-app-key/
 */
export async function POST() {
  try {
    const appkey = process.env.AMIVOICE_APPKEY;

    if (!appkey) {
      return NextResponse.json(
        { error: "AMIVOICE_APPKEY not configured" },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      epi: "3600000", // 1 hour in milliseconds
    });

    console.log("Requesting one-time APPKEY");

    const response = await fetch(
      "https://acp-api.amivoice.com/issue_service_authorization",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Bearer ${appkey}`,
        },
        body: params.toString(),
      }
    );

    const responseText = await response.text();
    console.log("AmiVoice response status:", response.status);
    console.log("AmiVoice response body:", responseText);

    if (!response.ok) {
      console.error("Failed to issue one-time APPKEY:", responseText);
      return NextResponse.json(
        { error: responseText || "Failed to issue one-time APPKEY" },
        { status: response.status }
      );
    }

    if (!responseText) {
      console.error("Empty response from AmiVoice");
      return NextResponse.json(
        { error: "Empty response from AmiVoice - check if APPKEY has 'can issue APPKEY' permission" },
        { status: 500 }
      );
    }

    return NextResponse.json({ appkey: responseText });
  } catch (error) {
    console.error("Error issuing one-time APPKEY:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

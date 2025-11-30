import { NextRequest, NextResponse } from "next/server";
import { structureMeeting } from "@/lib/ai/services";

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    const result = await structureMeeting(transcript);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error structuring meeting:", error);
    return NextResponse.json(
      { error: "Failed to structure meeting" },
      { status: 500 }
    );
  }
}

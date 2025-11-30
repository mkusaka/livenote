import { NextRequest, NextResponse } from "next/server";
import { extractTopics } from "@/lib/ai/services";

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const result = await extractTopics(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error extracting topics:", error);
    return NextResponse.json(
      { error: "Failed to extract topics" },
      { status: 500 }
    );
  }
}

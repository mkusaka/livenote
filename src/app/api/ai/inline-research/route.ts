import { NextRequest, NextResponse } from "next/server";
import { inlineResearch } from "@/lib/ai/services";

export async function POST(request: NextRequest) {
  try {
    const { selectedText, context } = await request.json();

    if (!selectedText || typeof selectedText !== "string") {
      return NextResponse.json(
        { error: "Selected text is required" },
        { status: 400 }
      );
    }

    const result = await inlineResearch(selectedText, context);

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error performing inline research:", error);
    return NextResponse.json(
      { error: "Failed to perform inline research" },
      { status: 500 }
    );
  }
}

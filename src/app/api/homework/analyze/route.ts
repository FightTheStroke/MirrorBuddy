import { NextRequest, NextResponse } from "next/server";
import { getAzureConfig } from "@/lib/ai/providers/config";
import { azureVisionCompletion } from "@/lib/ai/providers/azure";
import { logger } from "@/lib/logger";

/**
 * 🎓 Homework Analysis API (Maieutic/Socratic Method)
 */
export async function POST(req: NextRequest) {
  try {
    const { image, subject } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const config = getAzureConfig("gpt-4o"); // Use vision-capable model
    if (!config) {
      return NextResponse.json({ error: "AI Provider not configured" }, { status: 500 });
    }

    const systemPrompt = `You are a maieutic AI tutor. 
    Your goal is to help the student solve their homework by ASKING questions and providing HINTS.
    Subject: ${subject || "General"}.
    
    RULES:
    1. NEVER give the full answer immediately.
    2. Identify what the student already knows from the image.
    3. Break the problem into small, manageable cognitive steps.
    4. Use a supportive and encouraging tone.
    5. Output the response in a structured JSON format with: { "steps": string[], "explanation": string, "answer": string }
    Note: The 'answer' field should contain a hint for the first step, not the final result.`;

    const result = await azureVisionCompletion(config, image, systemPrompt);

    // Attempt to parse structured response
    try {
      const parsed = JSON.parse(result.content);
      return NextResponse.json(parsed);
    } catch {
      // Fallback if AI didn't output valid JSON
      return NextResponse.json({
        steps: ["Analyzing your work...", "Looking for key concepts"],
        explanation: result.content,
        answer: "Let's start by looking at the first part of the problem. What do you see?"
      });
    }

  } catch (error) {
    logger.error("Homework analysis failed", { error: String(error) });
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
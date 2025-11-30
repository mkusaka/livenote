import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <main className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight">LiveNote</h1>
        <p className="text-xl text-muted-foreground">
          AI-powered meeting transcription and knowledge organization.
          <br />
          Let AI handle the notes while you focus on the conversation.
        </p>

        <div className="flex gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/sign-up">Get Started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>

        <div className="pt-8 grid gap-6 md:grid-cols-3 text-left">
          <div className="space-y-2">
            <h3 className="font-semibold">Real-time Transcription</h3>
            <p className="text-sm text-muted-foreground">
              Instant speech-to-text with keyword and topic extraction as you
              talk.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Inline Research</h3>
            <p className="text-sm text-muted-foreground">
              Select any text and AI will research and explain it in context.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Structured Notes</h3>
            <p className="text-sm text-muted-foreground">
              Auto-generated summaries, decisions, and action items from your
              conversations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

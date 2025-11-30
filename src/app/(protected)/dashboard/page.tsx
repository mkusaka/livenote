import Link from "next/link";
import { requireAuth } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignOutButton } from "./sign-out-button";

export default async function DashboardPage() {
  const session = await requireAuth();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <SignOutButton />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome, {session.user.name}!</CardTitle>
            <CardDescription>{session.user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your LiveNote dashboard is ready. Start a new conversation to
              begin transcribing and organizing your meetings.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" size="lg" asChild>
              <Link href="/conversation/new">
                <Mic className="mr-2 h-4 w-4" />
                Start New Conversation
              </Link>
            </Button>
            <Button variant="outline" className="w-full" size="lg" disabled>
              View Past Conversations (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

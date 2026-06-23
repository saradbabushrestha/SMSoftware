import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Renders inside the dashboard shell for in-app `notFound()` calls.
export default function DashboardNotFound() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="size-7" />
        </span>
        <div className="max-w-md space-y-2">
          <p className="text-sm font-medium text-primary">404</p>
          <h2 className="text-xl font-semibold tracking-tight">We couldn’t find that</h2>
          <p className="text-sm text-muted-foreground">
            The record or page you’re looking for doesn’t exist, was removed, or you don’t have access to it.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft /> Back to dashboard
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

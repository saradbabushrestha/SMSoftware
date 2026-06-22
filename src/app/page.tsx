import { redirect } from "next/navigation";

// Entry point — auth state is resolved in middleware, which redirects "/".
// This server redirect is a safe fallback if middleware is bypassed.
export default function RootPage() {
  redirect("/dashboard");
}

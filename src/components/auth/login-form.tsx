"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Signing in…
        </>
      ) : (
        <>
          <LogIn className="size-4" /> Sign in
        </>
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function quickFill(email: string) {
    if (emailRef.current) emailRef.current.value = email;
    if (passwordRef.current) passwordRef.current.value = DEMO_PASSWORD;
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        {state.error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            defaultValue={state.email}
            required
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <span className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Forgot password?
            </span>
          </div>
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        <SubmitButton />
      </form>

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Demo accounts — click to fill
          <span className="h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => quickFill(acc.email)}
              className="rounded-md border border-input bg-background px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <span className="block font-medium text-foreground">{acc.label}</span>
              <span className="block truncate text-muted-foreground">{acc.email}</span>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Password for all demo accounts:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
            {DEMO_PASSWORD}
          </code>
        </p>
      </div>
    </div>
  );
}

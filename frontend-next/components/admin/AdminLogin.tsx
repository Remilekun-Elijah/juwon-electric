"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { AUTH_PATHS } from "@/lib/admin/modules";
import { ApiError, login, requestPasswordReset, resetPassword, saveAdminSession } from "@/lib/api/admin";
import { LIMITS, validateNewPassword } from "@/lib/validation";

type Mode = "login" | "forgot" | "reset";

const copy: Record<Mode, { title: string; description: string }> = {
  login: {
    title: "Welcome back",
    description: "Sign in to your admin account to continue.",
  },
  forgot: {
    title: "Forgot password?",
    description: "Enter the email address for your admin account and we’ll send you a reset token.",
  },
  reset: {
    title: "Set a new password",
    description: "Enter the reset token from your email and choose a new password.",
  },
};

const LOGO = "/logo.svg";

const linkClasses =
  "rounded-sm text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.");

/** Only same-site admin paths are followed after sign-in. */
const safeNext = () => {
  const next = new URLSearchParams(window.location.search).get("next") || "";
  const isAdminPath = next === "/admin" || next.startsWith("/admin/");
  const isAuthPath = AUTH_PATHS.some((path) => next.startsWith(path));
  return isAdminPath && !next.startsWith("//") && !isAuthPath ? next : "/admin";
};

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} id={id} required>
      <div className="relative">
        <Input
          size="lg"
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={LIMITS.passwordMax}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((state) => !state)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={id}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden w-[46%] flex-col justify-between gap-10 overflow-hidden bg-brand-800 px-12 py-11 text-white lg:flex xl:px-[76px]">
      <div
        aria-hidden="true"
        className="absolute -right-44 -top-44 h-[460px] w-[460px] rounded-full border-[90px] border-white/[0.045]"
      />
      <Link
        href="/"
        className="relative self-start rounded-lg bg-white px-4 py-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-800"
      >
        <Image src={LOGO} alt="Juwon Electric home" width={88} height={62} className="h-10 w-auto" priority />
      </Link>
      <div className="relative max-w-[470px]">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-200">Juwon Electric admin</p>
        <h2 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight xl:text-4xl">
          Orders, catalog and customer messages in one place.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-brand-100/90">
          Sign in to manage packages, follow up on orders and reply to enquiries.
        </p>
        <figure className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <Image
            src="/panel-4.webp"
            alt="Solar panels installed by Juwon Electric on a customer’s roof"
            width={2269}
            height={1563}
            sizes="(min-width: 1280px) 470px, 40vw"
            className="aspect-[16/9] w-full object-cover"
          />
          <figcaption className="px-4 py-3 text-xs text-white/70">A rooftop solar installation by our team.</figcaption>
        </figure>
      </div>
      <p className="relative text-xs text-white/60">© {new Date().getFullYear()} Juwon Electric</p>
    </aside>
  );
}

/** Port of the Vite AdminLogin: sign in, request a reset token and set a new password. */
export function AdminLogin({ initialMode = "login" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState({ username: "", password: "", token: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form, value: string) => setForm((state) => ({ ...state, [key]: value }));

  const goTo = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
    setForm((state) => ({ ...state, password: "", confirmPassword: "" }));
  };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await login(form.username, form.password);
      saveAdminSession(response.data.token, response.data.admin);
      router.replace(safeNext());
    } catch (caught) {
      // Show the server's message as-is (including the 429 lockout message with its wait time).
      setError(
        caught instanceof ApiError && caught.status === 429 && (!caught.message || caught.message === "Request failed")
          ? "Too many failed sign-in attempts. Try again later."
          : errorMessage(caught)
      );
      setLoading(false);
    }
  };

  const submitRequestReset = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await requestPasswordReset(form.username);
      // The token is only returned in development; otherwise it is emailed.
      const resetToken = response.data?.resetToken;
      setForm((state) => ({ ...state, token: resetToken || state.token, password: "", confirmPassword: "" }));
      setMode("reset");
      setMessage(
        resetToken
          ? "Development mode: the reset token has been filled in for you."
          : "If an account exists for that email, we’ve sent a reset token. Enter it below to set a new password."
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    // The server trims passwords, so check (and send) the trimmed value.
    const password = form.password.trim();
    const passwordError = validateNewPassword(password, form.username);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== form.confirmPassword.trim()) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword(form.username, form.token.trim(), password);
      setForm({ username: form.username, password: "", token: "", confirmPassword: "" });
      setMode("login");
      setMessage(`${response.message || "Password reset successful."} Sign in with your new password.`);
    } catch (caught) {
      // Invite and reset tokens expire after 30 minutes (contract §13.4): point people at a fresh token.
      const expired = caught instanceof ApiError && caught.status === 400 && /invalid or expired/i.test(caught.message);
      setError(
        expired
          ? `${caught.message} Reset and invite tokens expire after 30 minutes. Use “Request a new token” below (the same as “Forgot password?”) to get a new one.`
          : errorMessage(caught)
      );
    } finally {
      setLoading(false);
    }
  };

  const emailField = (
    <Field label="Email address" required>
      <Input
        size="lg"
        type="email"
        inputMode="email"
        autoComplete="username"
        placeholder="name@example.com"
        maxLength={LIMITS.email}
        value={form.username}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => update("username", event.target.value)}
        autoFocus={mode !== "reset" || !form.username}
      />
    </Field>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased [:where(&_*)]:border-slate-200">
      <BrandPanel />
      <main className="flex min-w-0 flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[468px] rounded-xl border border-slate-200 bg-white p-6 shadow-auth motion-safe:animate-fade-up sm:p-12">
          <Image src={LOGO} alt="Juwon Electric" width={88} height={62} className="mb-8 h-10 w-auto lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{copy[mode].title}</h1>
          <p className="mb-8 mt-1 text-sm text-slate-500">{copy[mode].description}</p>

          <div aria-live="polite" className={cn("space-y-3", (error || message) && "mb-6")}>
            {error && <Alert tone="danger">{error}</Alert>}
            {message && <Alert tone={mode === "reset" ? "info" : "success"}>{message}</Alert>}
          </div>

          {mode === "login" && (
            <form onSubmit={submitLogin} className="space-y-5">
              {emailField}
              <div className="space-y-2">
                <PasswordInput
                  id="admin-password"
                  label="Password"
                  value={form.password}
                  onChange={(value) => update("password", value)}
                  autoComplete="current-password"
                />
                <div className="flex justify-end">
                  <button type="button" className={linkClasses} onClick={() => goTo("forgot")}>
                    Forgot password?
                  </button>
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Signing in…">
                Sign in
              </Button>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={submitRequestReset} className="space-y-5">
              {emailField}
              <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Sending…">
                Send reset token
              </Button>
              <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                <button type="button" className={cn(linkClasses, "inline-flex items-center gap-1.5")} onClick={() => goTo("login")}>
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Back to sign in
                </button>
                <button type="button" className={cn(linkClasses, "inline-flex items-center gap-1.5")} onClick={() => goTo("reset")}>
                  <KeyRound aria-hidden="true" className="h-4 w-4" />
                  I already have a reset token
                </button>
              </div>
            </form>
          )}

          {mode === "reset" && (
            <form onSubmit={submitReset} className="space-y-5">
              {emailField}
              <Field label="Reset token" helper="Paste the token from the password reset email." required>
                <Input
                  size="lg"
                  autoComplete="one-time-code"
                  spellCheck={false}
                  className="font-mono text-xs"
                  maxLength={LIMITS.resetToken}
                  value={form.token}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => update("token", event.target.value)}
                  autoFocus={Boolean(form.username) && !form.token}
                />
              </Field>
              <PasswordInput
                id="admin-new-password"
                label="New password"
                value={form.password}
                onChange={(value) => update("password", value)}
                autoComplete="new-password"
                minLength={LIMITS.passwordMin}
              />
              <PasswordInput
                id="admin-confirm-password"
                label="Confirm new password"
                value={form.confirmPassword}
                onChange={(value) => update("confirmPassword", value)}
                autoComplete="new-password"
                minLength={LIMITS.passwordMin}
              />
              <p className="-mt-2 text-xs text-slate-500">
                Use {LIMITS.passwordMin}–{LIMITS.passwordMax} characters. Don’t use your email address or the part before the @.
              </p>
              <Button type="submit" size="lg" className="w-full" loading={loading} loadingText="Saving…">
                Reset password
              </Button>
              <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                <button type="button" className={cn(linkClasses, "inline-flex items-center gap-1.5")} onClick={() => goTo("login")}>
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                  Back to sign in
                </button>
                <button type="button" className={linkClasses} onClick={() => goTo("forgot")}>
                  Request a new token
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

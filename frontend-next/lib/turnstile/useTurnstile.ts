"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";

// Cloudflare Turnstile, rendered explicitly (port of frontend/src/utils/useTurnstile.js).
// Enabled only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; otherwise no script is loaded, no widget is rendered
// and no token is sent.
export const TURNSTILE_SITE_KEY = config.turnstileSiteKey.trim();
export const TURNSTILE_ENABLED = Boolean(TURNSTILE_SITE_KEY);

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

/** Loads the Turnstile script once per page and resolves with window.turnstile. */
export const loadTurnstile = (): Promise<TurnstileApi> => {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const fail = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    }
    const loaded = script;
    loaded.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : fail()), { once: true });
    loaded.addEventListener(
      "error",
      () => {
        loaded.remove();
        fail();
      },
      { once: true }
    );
  });
  return scriptPromise;
};

export const TURNSTILE_ERROR_MESSAGE = "Security check couldn’t load. Refresh the page and try again.";

export type Turnstile = {
  enabled: boolean;
  token: string;
  ready: boolean;
  error: string;
  /** Callback ref for the widget container (see <TurnstileWidget>). */
  bindContainer: (node: HTMLDivElement | null) => void;
  reset: () => void;
  withToken: <T extends object>(payload: T) => T & { turnstileToken?: string };
};

/**
 * useTurnstile({ action }) → { enabled, token, ready, error, bindContainer, reset, withToken }
 * - Pass `bindContainer` to an element's `ref` (see <TurnstileWidget>). It is a callback ref, so the widget renders
 *   as soon as the element mounts.
 * - `ready` is true when the widget is disabled or a token exists; use it to disable submit.
 * - `withToken(payload)` adds `turnstileToken` only when enabled.
 * - Call `reset()` after every submit (success or failure); tokens are single-use.
 */
export function useTurnstile({ action }: { action?: "contact" | "order" | "subscribe" } = {}): Turnstile {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_ENABLED || !container) return undefined;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled) return;
        widgetId.current = turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          appearance: "interaction-only",
          "refresh-expired": "auto",
          callback: (value: string) => {
            setToken(value);
            setError("");
          },
          "expired-callback": () => setToken(""),
          "timeout-callback": () => setToken(""),
          "error-callback": () => {
            setToken("");
            setError(TURNSTILE_ERROR_MESSAGE);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setError(TURNSTILE_ERROR_MESSAGE);
      });

    return () => {
      cancelled = true;
      if (widgetId.current != null) {
        try {
          window.turnstile?.remove(widgetId.current);
        } catch {
          // The widget may already be gone.
        }
        widgetId.current = null;
      }
    };
  }, [action, container]);

  const reset = useCallback(() => {
    if (!TURNSTILE_ENABLED) return;
    setToken("");
    if (widgetId.current != null) {
      try {
        window.turnstile?.reset(widgetId.current);
      } catch {
        // Ignore; a fresh token will be requested on the next render.
      }
    }
  }, []);

  const withToken = useCallback(
    <T extends object>(payload: T) => (TURNSTILE_ENABLED ? { ...payload, turnstileToken: token } : payload),
    [token]
  );

  return {
    enabled: TURNSTILE_ENABLED,
    token,
    ready: !TURNSTILE_ENABLED || Boolean(token),
    error,
    bindContainer: setContainer,
    reset,
    withToken,
  };
}

export default useTurnstile;

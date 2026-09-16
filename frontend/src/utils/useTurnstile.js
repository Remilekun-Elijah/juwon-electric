import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile, rendered explicitly. Enabled only when VITE_TURNSTILE_SITE_KEY is set;
// otherwise no script is loaded, no widget is rendered and no token is sent.
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || "").trim();
export const TURNSTILE_ENABLED = Boolean(TURNSTILE_SITE_KEY);

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise = null;

/** Loads the Turnstile script once per page and resolves with window.turnstile. */
export const loadTurnstile = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const fail = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    let script = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : fail()), { once: true });
    script.addEventListener("error", () => {
      script.remove();
      fail();
    }, { once: true });
  });
  return scriptPromise;
};

export const TURNSTILE_ERROR_MESSAGE = "Security check couldn’t load. Refresh the page and try again.";

/**
 * useTurnstile() → { enabled, token, ready, error, containerRef, reset, withToken }
 * - Attach `containerRef` to an element (see <TurnstileWidget>).
 * - `ready` is true when the widget is disabled or a token exists; use it to disable submit.
 * - `withToken(payload)` adds `turnstileToken` only when enabled.
 * - Call `reset()` after every submit (success or failure); tokens are single-use.
 */
export const useTurnstile = ({ action } = {}) => {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const containerRef = useRef(null);
  const widgetId = useRef(null);

  useEffect(() => {
    if (!TURNSTILE_ENABLED) return undefined;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetId.current = turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          appearance: "interaction-only",
          "refresh-expired": "auto",
          callback: (value) => {
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
  }, [action]);

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
    (payload) => (TURNSTILE_ENABLED ? { ...payload, turnstileToken: token } : payload),
    [token]
  );

  return {
    enabled: TURNSTILE_ENABLED,
    token,
    ready: !TURNSTILE_ENABLED || Boolean(token),
    error,
    containerRef,
    reset,
    withToken,
  };
};

export default useTurnstile;

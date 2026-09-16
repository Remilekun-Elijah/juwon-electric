/* eslint-disable react/prop-types */

/**
 * Container for a Turnstile widget created by useTurnstile(). Renders nothing when Turnstile is disabled.
 * The widget uses appearance "interaction-only", so it stays invisible unless a visitor must interact.
 */
const TurnstileWidget = ({ turnstile, className = "", errorClassName = "text-sm text-[#DB464C]" }) => {
  if (!turnstile?.enabled) return null;
  return (
    <div className={className}>
      <div ref={turnstile.containerRef} />
      {turnstile.error && (
        <p role="alert" className={errorClassName}>
          {turnstile.error}
        </p>
      )}
    </div>
  );
};

export default TurnstileWidget;

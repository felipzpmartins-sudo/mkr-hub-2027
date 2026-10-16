// Asterisco de seis pontas que acompanha os títulos gigantes (referência visual do wordmark).
export function Asterisk({ className = "" }: { className?: string }) {
  return (
    <svg className={`asterisk ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 1.5v21M2.9 6.75l18.2 10.5M21.1 6.75L2.9 17.25"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

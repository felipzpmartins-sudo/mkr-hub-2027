export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand ${large ? "brand-large" : ""}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="100%" height="100%" fill="none">
          <circle cx="16" cy="16" r="14.25" stroke="currentColor" strokeWidth="1.4" opacity=".5" />
          <circle className="brand-sun" cx="19.5" cy="12.5" r="4.6" fill="currentColor" />
          <path d="M6.5 21.2h19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M10 25h12"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity=".55"
          />
        </svg>
      </span>
      <span className="brand-word">
        MKR <strong>HUB</strong>
      </span>
    </span>
  );
}

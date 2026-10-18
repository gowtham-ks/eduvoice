/** The brand mark: a sealed envelope. Used in the header and on the sign-in page. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="1.5" y="5.5" width="25" height="18" rx="3" fill="var(--stamp-soft)" stroke="var(--stamp)" strokeWidth="1.4" />
      <path d="M2.5 7 13 15.5a1.6 1.6 0 0 0 2 0L25.5 7" stroke="var(--stamp)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="16" r="3.4" fill="var(--sealed)" />
      <path d="M12.6 16.1l1 1 1.9-2.1" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A wax seal that presses down once — the one animated moment, played while the credential request is in flight. */
export function WaxSeal({ pressing }: { pressing: boolean }) {
  return (
    <div className={`wax${pressing ? " pressing" : ""}`}>
      <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
        <circle cx="40" cy="40" r="36" fill="var(--sealed)" />
        <circle cx="40" cy="40" r="36" fill="none" stroke="#ffffff33" strokeWidth="2" />
        <path d="M26 41l9 9 19-20" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
 * The site mark: a cycle with a gap, a dot on the cycle and a page in the
 * center. The dot is the current state of the page, and the gap is the end
 * of the page.
 */
export function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 3a9 9 0 1 1-8.2 5.3" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="3" r="2.6" fill="var(--state-active)" />
      <circle cx="12" cy="12" r="3" fill="none" stroke="var(--color-ink)" strokeWidth="1.6" />
    </svg>
  );
}

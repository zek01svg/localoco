export function TissuePacketIcon({ className }: { className?: string }) {
  // A packet of pocket tissues — the Singapore "chope". Used as the visual
  // mark for bookmarks; interactive controls keep their own accessible names.
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 9h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9Z" />
      <path d="m5 9 2-4 2.5 3L12 4l2.5 4L17 5l2 4" />
      <path d="M5 14h14" />
    </svg>
  );
}

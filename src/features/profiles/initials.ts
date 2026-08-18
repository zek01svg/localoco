// Two initials from the display name, shared by the public and personal
// profile pages (Radix Avatar falls back to them until an image loads).
export function initialsOf(displayName: string): string {
  return displayName
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");
}

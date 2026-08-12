import { format } from "date-fns";

export function formatLatency(ms: number): string {
  if (ms >= 1000) {
    return (
      new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(ms / 1000) + "s"
    );
  }

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(ms) + "ms";
}

export function formatMilliseconds(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);
}

export function formatDate(value: Date | string) {
  return format(new Date(value), "LLL dd, y HH:mm");
}

export function formatCompactNumber(value: number) {
  // Hundreds stay as-is
  if (value >= 100 && value < 1000) {
    return value.toString();
  } else if (value >= 1000 && value < 1000000) {
    // Thousands
    return (value / 1000).toFixed(1) + "k";
  } else if (value >= 1000000) {
    // Millions
    return (value / 1000000).toFixed(1) + "M";
  }
  return value.toString();
}

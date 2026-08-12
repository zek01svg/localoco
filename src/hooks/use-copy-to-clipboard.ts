import { useCallback, useState } from "react";
import { toast } from "sonner";

interface CopyOptions {
  timeout?: number;
  withToast?: boolean;
}

const DEFAULT_COPY_OPTIONS: CopyOptions = { timeout: 3000, withToast: false };

export function useCopyToClipboard() {
  const [text, setText] = useState<string | null>(null);

  const copy = useCallback(
    async (value: string, { timeout, withToast }: CopyOptions = DEFAULT_COPY_OPTIONS) => {
      // DOM types declare `navigator.clipboard` as always present, but it is
      // undefined outside secure contexts (plain http), so this guard is real.
      // oxlint-disable-next-line typescript/no-unnecessary-condition
      if (!navigator.clipboard) {
        return false;
      }

      try {
        await navigator.clipboard.writeText(value);
        setText(value);

        if (timeout) {
          setTimeout(() => {
            setText(null);
          }, timeout);
        }

        if (withToast) {
          toast.success("Copied to clipboard");
        }

        return true;
      } catch {
        setText(null);
        return false;
      }
    },
    []
  );

  return { text, copy, isCopied: text !== null };
}

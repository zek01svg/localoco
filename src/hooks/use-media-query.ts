import * as React from "react";

export function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(false);

  // Sync with external media query — intentional with matchMedia
  /* oxlint-disable react/set-state-in-effect */
  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    setValue(result.matches);

    return () => {
      result.removeEventListener("change", onChange);
    };
  }, [query]);
  /* oxlint-enable react/set-state-in-effect */

  return value;
}

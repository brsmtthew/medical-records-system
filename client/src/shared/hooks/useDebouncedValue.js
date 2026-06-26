import { useEffect, useState } from "react";

// Returns a debounced copy of a fast-changing value (typically a search term).
// The input stays fully responsive while the heavy work that depends on the value
// — filtering and re-rendering large tables — only runs after typing settles,
// which keeps keystrokes smooth on big record lists.
export function useDebouncedValue(value, delay = 150) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
}

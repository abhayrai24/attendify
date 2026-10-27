import { useCallback, useEffect, useState } from "react";

const read = (valid, fallback) => {
  const id = window.location.hash.replace(/^#\/?/, "");
  return valid.includes(id) ? id : fallback;
};

/** Minimal hash router so refresh and the back button keep the current page. */
export function useHashRoute(valid, fallback) {
  const [route, setRoute] = useState(() => read(valid, fallback));

  useEffect(() => {
    const onChange = () => setRoute(read(valid, fallback));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [valid, fallback]);

  const navigate = useCallback((id) => {
    window.location.hash = `/${id}`;
  }, []);

  return [route, navigate];
}

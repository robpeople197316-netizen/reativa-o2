"use client";

import { useEffect, useState } from "react";

/**
 * Media query em JS, para quando esconder com CSS não basta.
 *
 * O padrão é aplicado no servidor e no primeiro render do cliente — só depois
 * o valor real entra —, então a hidratação nunca diverge.
 */
export function useMediaQuery(query: string, defaultValue = false) {
  const [matches, setMatches] = useState(defaultValue);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);

    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);

  return matches;
}

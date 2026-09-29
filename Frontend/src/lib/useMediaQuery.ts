import { useEffect, useState } from "react";

/**
 * Acompanha uma media query em JavaScript.
 *
 * Existe para a DataTable escolher entre tabela e cartoes renderizando so um
 * dos dois. Dava para resolver com `hidden md:block`, mas ai as duas arvores
 * ficam no DOM: o conteudo e montado duas vezes a cada render, e aparece
 * duplicado para qualquer leitor que nao esteja aplicando o CSS.
 */
export function useMediaQuery(query: string): boolean {
  const [combina, setCombina] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return true;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia(query);
    setCombina(mql.matches);

    const aoMudar = (e: MediaQueryListEvent) => setCombina(e.matches);
    mql.addEventListener("change", aoMudar);
    return () => mql.removeEventListener("change", aoMudar);
  }, [query]);

  return combina;
}

/** Ponto de corte md do Tailwind, onde a tabela passa a caber. */
export function useEhTelaMedia() {
  return useMediaQuery("(min-width: 768px)");
}

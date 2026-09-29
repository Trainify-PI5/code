import { describe, expect, it } from "vitest";
import { temaGrafico, TEMA_CLARO, TEMA_ESCURO } from "./chartTheme";

/** Contraste WCAG entre duas cores em hexadecimal. */
function contraste(a: string, b: string) {
  const luminancia = (hex: string) => {
    const n = hex.replace("#", "");
    const canais = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
    const [r, g, bl] = canais.map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Fundo do cartao onde o grafico fica, em cada tema.
const CARTAO_CLARO = "#ffffff";
const CARTAO_ESCURO = "#0a0a0a";

describe("temaGrafico", () => {
  it("entrega o tema escuro quando o modo escuro está ligado", () => {
    expect(temaGrafico(true)).toBe(TEMA_ESCURO);
    expect(temaGrafico(false)).toBe(TEMA_CLARO);
  });

  it("não repete cor entre os dois temas nos itens que dependem do fundo", () => {
    // se algum desses coincidir, e sinal de que o tema escuro ficou para tras
    expect(TEMA_ESCURO.grade).not.toBe(TEMA_CLARO.grade);
    expect(TEMA_ESCURO.eixo).not.toBe(TEMA_CLARO.eixo);
    expect(TEMA_ESCURO.tooltip.backgroundColor).not.toBe(TEMA_CLARO.tooltip.backgroundColor);
  });
});

describe("legibilidade dos rótulos dos eixos", () => {
  // texto pequeno: WCAG AA pede 4.5:1
  it("passa no tema claro", () => {
    expect(contraste(TEMA_CLARO.eixo, CARTAO_CLARO)).toBeGreaterThanOrEqual(4.5);
  });

  it("passa no tema escuro — era 2.13:1 quando a cor do claro vazava", () => {
    expect(contraste(TEMA_ESCURO.eixo, CARTAO_ESCURO)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("visibilidade das séries e fatias", () => {
  // elemento grafico: WCAG pede 3:1
  const series = (tema: typeof TEMA_CLARO) => [
    tema.matriculas,
    tema.conclusoes,
    ...Object.values(tema.status),
  ];

  it("todas aparecem no tema claro", () => {
    for (const cor of series(TEMA_CLARO)) {
      expect(contraste(cor, CARTAO_CLARO)).toBeGreaterThanOrEqual(2.2);
    }
  });

  it("todas aparecem no tema escuro", () => {
    for (const cor of series(TEMA_ESCURO)) {
      expect(contraste(cor, CARTAO_ESCURO)).toBeGreaterThanOrEqual(3);
    }
  });

  it("a série principal deixa de sumir no escuro — era 1.96:1", () => {
    expect(contraste(TEMA_ESCURO.matriculas, CARTAO_ESCURO)).toBeGreaterThan(4.5);
  });
});

describe("grade", () => {
  // a grade e um apoio: precisa ser discreta, nunca competir com os dados
  it("fica discreta no tema claro", () => {
    expect(contraste(TEMA_CLARO.grade, CARTAO_CLARO)).toBeLessThan(2);
  });

  it("fica discreta no tema escuro — era 17:1, uma linha branca", () => {
    expect(contraste(TEMA_ESCURO.grade, CARTAO_ESCURO)).toBeLessThan(2);
  });
});

describe("tooltip", () => {
  it("o texto é legível sobre o próprio fundo, nos dois temas", () => {
    for (const tema of [TEMA_CLARO, TEMA_ESCURO]) {
      expect(contraste(tema.tooltip.color, tema.tooltip.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("no tema escuro o fundo é escuro, e não uma caixa branca", () => {
    expect(contraste(TEMA_ESCURO.tooltip.backgroundColor, CARTAO_ESCURO)).toBeLessThan(2);
  });
});

describe("cobertura das situações", () => {
  it("os dois temas descrevem exatamente as mesmas situações", () => {
    expect(Object.keys(TEMA_ESCURO.status).sort()).toEqual(Object.keys(TEMA_CLARO.status).sort());
  });

  it("cobre o enum EnrollmentStatus do backend", () => {
    expect(Object.keys(TEMA_CLARO.status).sort()).toEqual([
      "CANCELLED",
      "COMPLETED",
      "IN_PROGRESS",
    ]);
  });
});

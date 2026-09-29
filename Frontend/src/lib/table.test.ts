import { describe, expect, it } from "vitest";
import {
  alternarOrdenacao,
  fatiarPagina,
  intervaloVisivel,
  janelaDePaginas,
  ordenarLinhas,
  paginaValida,
  totalDePaginas,
} from "./table";

interface Linha {
  nome: string;
  nota: number | null;
  data: string;
}

const linhas: Linha[] = [
  { nome: "Ética", nota: 70, data: "2026-03-01" },
  { nome: "estratégia", nota: null, data: "2026-01-15" },
  { nome: "Alinhamento", nota: 100, data: "2026-02-20" },
];

describe("ordenarLinhas", () => {
  it("não altera o array recebido", () => {
    const copia = [...linhas];
    ordenarLinhas(linhas, (l) => l.nome, "asc");
    expect(linhas).toEqual(copia);
  });

  it("devolve a lista intacta quando a coluna não é ordenável", () => {
    expect(ordenarLinhas(linhas, undefined, "asc")).toBe(linhas);
  });

  it("ordena texto respeitando acento do português", () => {
    const r = ordenarLinhas(linhas, (l) => l.nome, "asc").map((l) => l.nome);
    expect(r).toEqual(["Alinhamento", "estratégia", "Ética"]);
  });

  it("ignora maiúscula e minúscula", () => {
    const dados = [{ n: "banana" }, { n: "Abacate" }, { n: "cereja" }];
    expect(ordenarLinhas(dados, (d) => d.n, "asc").map((d) => d.n)).toEqual([
      "Abacate",
      "banana",
      "cereja",
    ]);
  });

  it("ordena número como número, não como texto", () => {
    const dados = [{ v: 9 }, { v: 100 }, { v: 25 }];
    expect(ordenarLinhas(dados, (d) => d.v, "asc").map((d) => d.v)).toEqual([9, 25, 100]);
  });

  it("entende número dentro do texto — Módulo 9 antes de Módulo 10", () => {
    const dados = [{ n: "Módulo 10" }, { n: "Módulo 9" }, { n: "Módulo 2" }];
    expect(ordenarLinhas(dados, (d) => d.n, "asc").map((d) => d.n)).toEqual([
      "Módulo 2",
      "Módulo 9",
      "Módulo 10",
    ]);
  });

  it("ordena data pelo instante, não pelo texto", () => {
    const r = ordenarLinhas(linhas, (l) => new Date(l.data), "asc").map((l) => l.data);
    expect(r).toEqual(["2026-01-15", "2026-02-20", "2026-03-01"]);
  });

  it("inverte na direção desc", () => {
    const r = ordenarLinhas(linhas, (l) => l.nome, "desc").map((l) => l.nome);
    expect(r).toEqual(["Ética", "estratégia", "Alinhamento"]);
  });

  it("joga o vazio para o fim, nas DUAS direções", () => {
    const asc = ordenarLinhas(linhas, (l) => l.nota, "asc").map((l) => l.nota);
    const desc = ordenarLinhas(linhas, (l) => l.nota, "desc").map((l) => l.nota);
    expect(asc).toEqual([70, 100, null]);
    expect(desc).toEqual([100, 70, null]);
  });

  it("trata string vazia como vazio", () => {
    const dados = [{ n: "b" }, { n: "" }, { n: "a" }];
    expect(ordenarLinhas(dados, (d) => d.n, "asc").map((d) => d.n)).toEqual(["a", "b", ""]);
  });

  it("aguenta lista vazia e de um item só", () => {
    expect(ordenarLinhas([], (l: Linha) => l.nome, "asc")).toEqual([]);
    expect(ordenarLinhas([linhas[0]], (l) => l.nome, "desc")).toEqual([linhas[0]]);
  });
});

describe("totalDePaginas", () => {
  it("arredonda para cima", () => {
    expect(totalDePaginas(21, 20)).toBe(2);
    expect(totalDePaginas(40, 20)).toBe(2);
  });

  it("nunca devolve zero — não existe 'página 0 de 0'", () => {
    expect(totalDePaginas(0, 20)).toBe(1);
  });

  it("porPagina 0 significa sem paginação", () => {
    expect(totalDePaginas(137, 0)).toBe(1);
  });
});

describe("paginaValida", () => {
  it("prende a página dentro do intervalo", () => {
    expect(paginaValida(99, 30, 10)).toBe(3);
    expect(paginaValida(0, 30, 10)).toBe(1);
    expect(paginaValida(-5, 30, 10)).toBe(1);
  });

  it("volta para a 1 quando um filtro esvazia a lista", () => {
    expect(paginaValida(5, 0, 10)).toBe(1);
  });
});

describe("fatiarPagina", () => {
  const numeros = Array.from({ length: 25 }, (_, i) => i + 1);

  it("devolve a fatia certa", () => {
    expect(fatiarPagina(numeros, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(fatiarPagina(numeros, 3, 10)).toEqual([21, 22, 23, 24, 25]);
  });

  it("não devolve página vazia quando o número pedido passou do fim", () => {
    expect(fatiarPagina(numeros, 99, 10)).toEqual([21, 22, 23, 24, 25]);
  });

  it("devolve tudo quando a paginação está desligada", () => {
    expect(fatiarPagina(numeros, 1, 0)).toBe(numeros);
  });
});

describe("intervaloVisivel", () => {
  it("conta a partir de 1, para humanos", () => {
    expect(intervaloVisivel(137, 1, 20)).toEqual({ de: 1, ate: 20, total: 137 });
    expect(intervaloVisivel(137, 7, 20)).toEqual({ de: 121, ate: 137, total: 137 });
  });

  it("mostra zero quando não há nada", () => {
    expect(intervaloVisivel(0, 1, 20)).toEqual({ de: 0, ate: 0, total: 0 });
  });

  it("cobre a lista inteira sem paginação", () => {
    expect(intervaloVisivel(137, 1, 0)).toEqual({ de: 1, ate: 137, total: 137 });
  });
});

describe("janelaDePaginas", () => {
  it("mostra todas quando são poucas", () => {
    expect(janelaDePaginas(1, 3)).toEqual([1, 2, 3]);
  });

  it("corta com reticências no meio de uma lista longa", () => {
    expect(janelaDePaginas(8, 42)).toEqual([1, null, 7, 8, 9, null, 42]);
  });

  it("não corta no começo quando a página atual está perto dele", () => {
    expect(janelaDePaginas(2, 42)).toEqual([1, 2, 3, null, 42]);
  });

  it("não corta no fim quando a página atual está perto dele", () => {
    expect(janelaDePaginas(41, 42)).toEqual([1, null, 40, 41, 42]);
  });

  it("mostra o número em vez de reticências quando o pulo é de uma página só", () => {
    // "1 … 3" ocuparia o mesmo espaco que "1 2 3"
    expect(janelaDePaginas(4, 6)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("devolve uma página quando só existe uma", () => {
    expect(janelaDePaginas(1, 1)).toEqual([1]);
    expect(janelaDePaginas(1, 0)).toEqual([1]);
  });
});

describe("alternarOrdenacao", () => {
  it("começa em ascendente numa coluna nova", () => {
    expect(alternarOrdenacao(null, "nome")).toEqual({ key: "nome", direcao: "asc" });
    expect(alternarOrdenacao({ key: "nota", direcao: "desc" }, "nome")).toEqual({
      key: "nome",
      direcao: "asc",
    });
  });

  it("inverte ao clicar na mesma coluna", () => {
    expect(alternarOrdenacao({ key: "nome", direcao: "asc" }, "nome")).toEqual({
      key: "nome",
      direcao: "desc",
    });
    expect(alternarOrdenacao({ key: "nome", direcao: "desc" }, "nome")).toEqual({
      key: "nome",
      direcao: "asc",
    });
  });
});

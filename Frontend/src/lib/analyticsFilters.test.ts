import { describe, expect, it } from "vitest";
import {
  aplicarFiltros,
  contarFiltrosAtivos,
  cursosDisponiveis,
  FILTROS_VAZIOS,
  temFiltroAtivo,
  type LinhaFiltravel,
} from "./analyticsFilters";

const linhas: LinhaFiltravel[] = [
  { courseId: "c1", status: "IN_PROGRESS", studentName: "Ana Souza", studentEmail: "ana@trainify.com" },
  { courseId: "c1", status: "COMPLETED", studentName: "João Pereira", studentEmail: "joao@trainify.com" },
  { courseId: "c2", status: "COMPLETED", studentName: "Bruno Lima", studentEmail: "bruno@trainify.com" },
  { courseId: "c2", status: "CANCELLED", studentName: "Carla Dias", studentEmail: "carla@outra.com" },
];

describe("aplicarFiltros", () => {
  it("devolve tudo quando nenhum filtro está marcado", () => {
    expect(aplicarFiltros(linhas, FILTROS_VAZIOS)).toHaveLength(4);
  });

  it("filtra por curso", () => {
    const r = aplicarFiltros(linhas, { ...FILTROS_VAZIOS, courseId: "c1" });
    expect(r.map((l) => l.studentName)).toEqual(["Ana Souza", "João Pereira"]);
  });

  it("filtra por situação", () => {
    const r = aplicarFiltros(linhas, { ...FILTROS_VAZIOS, status: "COMPLETED" });
    expect(r).toHaveLength(2);
  });

  it("combina curso e situação (E, não OU)", () => {
    const r = aplicarFiltros(linhas, { ...FILTROS_VAZIOS, courseId: "c2", status: "COMPLETED" });
    expect(r.map((l) => l.studentName)).toEqual(["Bruno Lima"]);
  });

  it("acha o aluno mesmo escrevendo sem acento", () => {
    const r = aplicarFiltros(linhas, { ...FILTROS_VAZIOS, busca: "joao" });
    expect(r.map((l) => l.studentName)).toEqual(["João Pereira"]);
  });

  it("ignora a caixa da busca", () => {
    expect(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, busca: "BRUNO" })).toHaveLength(1);
  });

  it("busca também pelo e-mail", () => {
    const r = aplicarFiltros(linhas, { ...FILTROS_VAZIOS, busca: "@outra.com" });
    expect(r.map((l) => l.studentName)).toEqual(["Carla Dias"]);
  });

  it("ignora espaços em volta da busca", () => {
    expect(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, busca: "   " })).toHaveLength(4);
  });

  it("devolve lista vazia quando nada combina", () => {
    expect(aplicarFiltros(linhas, { ...FILTROS_VAZIOS, busca: "ninguem" })).toEqual([]);
  });

  it("não quebra com nome ou e-mail ausente", () => {
    const incompleta: LinhaFiltravel[] = [{ courseId: "c1", status: "COMPLETED" }];
    expect(aplicarFiltros(incompleta, { ...FILTROS_VAZIOS, busca: "ana" })).toEqual([]);
    expect(aplicarFiltros(incompleta, { ...FILTROS_VAZIOS, status: "COMPLETED" })).toHaveLength(1);
  });
});

describe("contarFiltrosAtivos", () => {
  it("conta zero quando está tudo vazio", () => {
    expect(contarFiltrosAtivos(FILTROS_VAZIOS)).toBe(0);
    expect(temFiltroAtivo(FILTROS_VAZIOS)).toBe(false);
  });

  it("não conta busca feita só de espaços", () => {
    expect(contarFiltrosAtivos({ ...FILTROS_VAZIOS, busca: "  " })).toBe(0);
  });

  it("conta cada campo preenchido", () => {
    expect(contarFiltrosAtivos({ courseId: "c1", status: "COMPLETED", busca: "ana" })).toBe(3);
    expect(temFiltroAtivo({ ...FILTROS_VAZIOS, courseId: "c1" })).toBe(true);
  });
});

describe("cursosDisponiveis", () => {
  it("não repete curso e ordena pelo título", () => {
    expect(
      cursosDisponiveis([
        { courseId: "c2", courseTitle: "Zelo" },
        { courseId: "c1", courseTitle: "Ativo" },
        { courseId: "c2", courseTitle: "Zelo" },
      ]),
    ).toEqual([
      { id: "c1", titulo: "Ativo" },
      { id: "c2", titulo: "Zelo" },
    ]);
  });

  it("ordena respeitando acento do português", () => {
    const r = cursosDisponiveis([
      { courseId: "b", courseTitle: "Ética" },
      { courseId: "a", courseTitle: "Estratégia" },
    ]);
    expect(r.map((c) => c.titulo)).toEqual(["Estratégia", "Ética"]);
  });

  it("descarta linha sem curso", () => {
    expect(cursosDisponiveis([{ courseId: null, courseTitle: "Sem id" }])).toEqual([]);
  });

  it("usa o id como rótulo quando o título não veio", () => {
    expect(cursosDisponiveis([{ courseId: "c9", courseTitle: null }])).toEqual([
      { id: "c9", titulo: "c9" },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { montarCSV } from "./download";

const BOM = String.fromCharCode(0xfeff);

describe("montarCSV", () => {
  it("começa com BOM, para o Excel reconhecer os acentos", () => {
    const csv = montarCSV(["Aluno"], [["Ana"]]);
    expect(csv.startsWith(BOM)).toBe(true);
  });

  it("usa ponto e vírgula como separador (padrão pt-BR)", () => {
    const csv = montarCSV(["Aluno", "Curso"], [["Ana", "Liderança"]]);
    expect(csv).toContain('"Aluno";"Curso"');
    expect(csv).toContain('"Ana";"Liderança"');
  });

  it("separa as linhas com CRLF", () => {
    const csv = montarCSV(["A"], [["1"], ["2"]]);
    expect(csv.split("\r\n")).toHaveLength(3);
  });

  it("escapa aspas duplicando-as, sem quebrar a coluna", () => {
    const csv = montarCSV(["Curso"], [['Curso "Avançado"']]);
    expect(csv).toContain('"Curso ""Avançado"""');
  });

  it("mantém ponto e vírgula do conteúdo dentro do campo", () => {
    const csv = montarCSV(["Obs"], [["parte 1; parte 2"]]);
    expect(csv).toContain('"parte 1; parte 2"');
    expect(csv.split("\r\n")[1]).toBe('"parte 1; parte 2"');
  });

  it("transforma null e undefined em campo vazio", () => {
    const csv = montarCSV(["A", "B"], [[null, undefined]]);
    expect(csv.split("\r\n")[1]).toBe('"";""');
  });

  it("aceita números sem convertê-los em vazio", () => {
    const csv = montarCSV(["Nota"], [[0]]);
    expect(csv.split("\r\n")[1]).toBe('"0"');
  });

  it("gera só o cabeçalho quando não há linhas", () => {
    const csv = montarCSV(["Aluno"], []);
    expect(csv).toBe(`${BOM}"Aluno"`);
  });
});

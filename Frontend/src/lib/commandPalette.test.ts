import { describe, expect, it } from "vitest";
import {
  achatar,
  montarSecoes,
  normalizar,
  pontuar,
  proximoIndice,
  type Comando,
} from "./commandPalette";

const comando = (parcial: Partial<Comando> & { titulo: string }): Comando => ({
  id: parcial.titulo,
  grupo: "navegacao",
  executar: () => {},
  ...parcial,
});

describe("normalizar", () => {
  it("tira acento e caixa", () => {
    expect(normalizar("Análises")).toBe("analises");
    expect(normalizar("INTEGRAÇÃO")).toBe("integracao");
  });

  it("aguenta nulo sem quebrar", () => {
    expect(normalizar(undefined as unknown as string)).toBe("");
  });
});

describe("pontuar", () => {
  const cursos = comando({ titulo: "Cursos" });

  it("sem termo, tudo serve", () => {
    expect(pontuar(cursos, "")).toBe(0);
    expect(pontuar(cursos, "   ")).toBe(0);
  });

  it("acha ignorando acento", () => {
    expect(pontuar(comando({ titulo: "Análises" }), "analise")).not.toBeNull();
  });

  it("devolve null quando não serve", () => {
    expect(pontuar(cursos, "zzz")).toBeNull();
  });

  it("título que começa com o termo vale mais que título que só contém", () => {
    const comeca = pontuar(comando({ titulo: "Cursos" }), "cur")!;
    const contem = pontuar(comando({ titulo: "Meus cursos antigos" }), "rsos")!;
    expect(comeca).toBeGreaterThan(contem);
  });

  it("palavra do meio que começa com o termo vale mais que trecho solto", () => {
    const palavra = pontuar(comando({ titulo: "Criar Curso" }), "cur")!;
    const trecho = pontuar(comando({ titulo: "Percurso" }), "cur")!;
    expect(palavra).toBeGreaterThan(trecho);
  });

  it("no empate, o título mais curto vem primeiro", () => {
    const curto = pontuar(comando({ titulo: "Cursos" }), "cur")!;
    const longo = pontuar(comando({ titulo: "Cursos concluídos no ano" }), "cur")!;
    expect(curto).toBeGreaterThan(longo);
  });

  it("encontra por sinônimo, que não aparece na tela", () => {
    const c = comando({ titulo: "Dashboards", sinonimos: ["relatório", "métricas"] });
    expect(pontuar(c, "metricas")).not.toBeNull();
  });

  it("encontra pela descrição, mas vale menos que pelo título", () => {
    const porTitulo = pontuar(comando({ titulo: "Ana Souza" }), "ana")!;
    const porDescricao = pontuar(
      comando({ titulo: "Bruno Lima", descricao: "ana@trainify.com" }),
      "ana",
    )!;
    expect(porTitulo).toBeGreaterThan(porDescricao);
  });

  it("não faz busca difusa — letras espalhadas não contam", () => {
    // "cur" dentro de "Configurações da Empresa" so aparece espalhado
    expect(pontuar(comando({ titulo: "Configurações da Empresa" }), "cur")).toBeNull();
  });
});

describe("montarSecoes", () => {
  const comandos: Comando[] = [
    comando({ titulo: "Cursos", grupo: "navegacao" }),
    comando({ titulo: "Criar Curso", grupo: "navegacao" }),
    comando({ titulo: "Configurações", grupo: "navegacao" }),
    comando({ titulo: "Integração de Novos Colaboradores", grupo: "curso" }),
    comando({ titulo: "Ana Souza", grupo: "usuario", descricao: "ana@trainify.com" }),
    comando({ titulo: "Alternar tema", grupo: "acao" }),
  ];

  it("agrupa e respeita a ordem dos grupos", () => {
    const secoes = montarSecoes(comandos, "");
    expect(secoes.map((s) => s.grupo)).toEqual(["navegacao", "curso", "usuario", "acao"]);
  });

  it("dá rótulo em português a cada grupo", () => {
    const secoes = montarSecoes(comandos, "");
    expect(secoes.map((s) => s.rotulo)).toEqual(["Ir para", "Cursos", "Usuários", "Ações"]);
  });

  it("some com o grupo que ficou vazio", () => {
    const secoes = montarSecoes(comandos, "integra");
    expect(secoes.map((s) => s.grupo)).toEqual(["curso"]);
  });

  it("ordena dentro do grupo pela pontuação", () => {
    const secoes = montarSecoes(comandos, "cur");
    expect(secoes[0].comandos.map((c) => c.titulo)).toEqual(["Cursos", "Criar Curso"]);
  });

  it("limita por grupo, para muitos cursos não empurrarem a navegação", () => {
    const muitos = Array.from({ length: 30 }, (_, i) =>
      comando({ titulo: `Curso ${i}`, id: `c${i}`, grupo: "curso" }),
    );
    const secoes = montarSecoes([...comandos, ...muitos], "curso");
    const cursos = secoes.find((s) => s.grupo === "curso");
    expect(cursos!.comandos).toHaveLength(5);
  });

  it("devolve nada quando o termo não acha ninguém", () => {
    expect(montarSecoes(comandos, "zzzzz")).toEqual([]);
  });

  it("acha usuário pelo e-mail", () => {
    const secoes = montarSecoes(comandos, "@trainify");
    expect(secoes[0].comandos[0].titulo).toBe("Ana Souza");
  });
});

describe("achatar", () => {
  it("devolve a lista na ordem que aparece na tela", () => {
    const secoes = montarSecoes(
      [
        comando({ titulo: "Cursos", grupo: "navegacao" }),
        comando({ titulo: "Alternar tema", grupo: "acao" }),
        comando({ titulo: "Curso de Ética", grupo: "curso" }),
      ],
      "",
    );
    expect(achatar(secoes).map((c) => c.titulo)).toEqual([
      "Cursos",
      "Curso de Ética",
      "Alternar tema",
    ]);
  });
});

describe("proximoIndice", () => {
  it("anda para frente e para trás", () => {
    expect(proximoIndice(0, 3, 1)).toBe(1);
    expect(proximoIndice(2, 3, -1)).toBe(1);
  });

  it("dá a volta nas duas pontas", () => {
    expect(proximoIndice(2, 3, 1)).toBe(0);
    expect(proximoIndice(0, 3, -1)).toBe(2);
  });

  it("não quebra com a lista vazia", () => {
    expect(proximoIndice(0, 0, 1)).toBe(0);
  });
});

describe("montarSecoes — limite por grupo", () => {
  it("mostra a navegação inteira, sem teto", () => {
    // um teto aqui esconde item do menu conforme o perfil ganha telas: com 12,
    // "Criar Curso" — o 13o para um admin — sumia da paleta
    const menu = Array.from({ length: 30 }, (_, i) =>
      comando({ titulo: `Item ${i}`, id: `n${i}`, grupo: "navegacao" }),
    );
    expect(montarSecoes(menu, "")[0].comandos).toHaveLength(30);
  });

  it("segura cursos e usuários em cinco, que vêm da API e podem ser centenas", () => {
    const muitos = Array.from({ length: 50 }, (_, i) =>
      comando({ titulo: `Curso ${i}`, id: `c${i}`, grupo: "curso" }),
    );
    expect(montarSecoes(muitos, "")[0].comandos).toHaveLength(5);
  });

  it("sem termo, preserva a ordem de declaração em vez de alfabetar", () => {
    const menu = [
      comando({ titulo: "Início", id: "1" }),
      comando({ titulo: "Cursos", id: "2" }),
      comando({ titulo: "Auditoria", id: "3" }),
    ];
    expect(montarSecoes(menu, "")[0].comandos.map((c) => c.titulo)).toEqual([
      "Início",
      "Cursos",
      "Auditoria",
    ]);
  });

  it("com termo, volta a ordenar por relevância", () => {
    const menu = [
      comando({ titulo: "Meus cursos antigos", id: "1" }),
      comando({ titulo: "Cursos", id: "2" }),
    ];
    expect(montarSecoes(menu, "curso")[0].comandos.map((c) => c.titulo)).toEqual([
      "Cursos",
      "Meus cursos antigos",
    ]);
  });
});

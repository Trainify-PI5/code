import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  alternarOrdenacao,
  fatiarPagina,
  intervaloVisivel,
  janelaDePaginas,
  ordenarLinhas,
  paginaValida,
  totalDePaginas,
  type Ordenacao,
  type ValorOrdenavel,
} from "../../lib/table";
import { SkeletonTableRows } from "./Skeleton";
import { useEhTelaMedia } from "../../lib/useMediaQuery";

export interface Coluna<T> {
  key: string;
  header: ReactNode;
  render: (linha: T) => ReactNode;
  /** Sem isto a coluna nao ordena — acoes e icones nao deveriam ordenar. */
  sortValue?: (linha: T) => ValorOrdenavel;
  align?: "left" | "right" | "center";
  /** No cartao do celular, esconde o rotulo (util na coluna de acoes). */
  hideLabelOnMobile?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Coluna<T>[];
  rows: T[];
  rowKey: (linha: T) => string;
  loading?: boolean;
  emptyMessage?: ReactNode;
  /** Linhas por pagina; 0 desliga a paginacao. */
  pageSize?: number;
  initialSort?: Ordenacao;
  skeletonRows?: number;
  /** Esqueleto com foto na primeira coluna, para a altura bater. */
  skeletonAvatar?: boolean;
  className?: string;
}

const alinhamento = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

/**
 * Tabela com ordenacao e paginacao, ambas no cliente — nenhum endpoint da API
 * aceita page/size/sort, as listas chegam inteiras.
 *
 * Abaixo de md a tabela vira uma lista de cartoes rotulados: uma tabela de
 * cinco colunas num celular ou estoura a tela ou vira rolagem horizontal, e
 * as duas coisas sao piores do que trocar de formato. So um dos dois e
 * montado — manter os dois no DOM duplicaria o conteudo para quem le sem CSS.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = "Nenhum registro encontrado.",
  pageSize = 20,
  initialSort,
  skeletonRows = 5,
  skeletonAvatar = false,
  className,
}: DataTableProps<T>) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao | null>(initialSort ?? null);
  const [pagina, setPagina] = useState(1);
  const tabelaCabe = useEhTelaMedia();

  const ordenadas = useMemo(() => {
    if (!ordenacao) return rows;
    const coluna = columns.find((c) => c.key === ordenacao.key);
    return ordenarLinhas(rows, coluna?.sortValue, ordenacao.direcao);
  }, [rows, columns, ordenacao]);

  // a lista pode encolher por um filtro externo enquanto estamos na pagina 5
  const paginaAtual = paginaValida(pagina, ordenadas.length, pageSize);
  const visiveis = fatiarPagina(ordenadas, paginaAtual, pageSize);
  const paginas = totalDePaginas(ordenadas.length, pageSize);
  const intervalo = intervaloVisivel(ordenadas.length, paginaAtual, pageSize);

  const ordenarPor = (key: string) => {
    setOrdenacao((atual) => alternarOrdenacao(atual, key));
    setPagina(1);
  };

  const vazio = !loading && ordenadas.length === 0;

  return (
    <div className={cn("w-full", className)}>
      {/* Tabela — a partir de md */}
      {tabelaCabe && (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-busy={loading}>
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              {columns.map((coluna) => {
                const ativa = ordenacao?.key === coluna.key;
                return (
                  <th
                    key={coluna.key}
                    scope="col"
                    // aria-sort e o que faz o leitor de tela anunciar a ordem
                    aria-sort={
                      !coluna.sortValue
                        ? undefined
                        : ativa
                          ? ordenacao.direcao === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                    }
                    className={cn(
                      "p-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest",
                      alinhamento[coluna.align ?? "left"],
                    )}
                  >
                    {coluna.sortValue ? (
                      <button
                        type="button"
                        onClick={() => ordenarPor(coluna.key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 uppercase tracking-widest rounded transition-colors hover:text-primary",
                          ativa && "text-primary",
                          coluna.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {coluna.header}
                        {ativa ? (
                          ordenacao.direcao === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                          )
                        ) : (
                          // o icone neutro fica esmaecido, mas sempre presente:
                          // se aparecesse so no hover, ninguem descobriria que ordena
                          <ChevronsUpDown
                            className="w-3.5 h-3.5 opacity-40"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ) : (
                      coluna.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant text-sm">
            {loading && (
              <SkeletonTableRows
                rows={skeletonRows}
                columns={columns.length}
                avatar={skeletonAvatar}
              />
            )}
            {vazio && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-10 text-center text-on-surface-variant"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {!loading &&
              visiveis.map((linha) => (
                <tr
                  key={rowKey(linha)}
                  className="hover:bg-surface-bright transition-colors"
                >
                  {columns.map((coluna) => (
                    <td
                      key={coluna.key}
                      className={cn(
                        "p-4",
                        alinhamento[coluna.align ?? "left"],
                        coluna.className,
                      )}
                    >
                      {coluna.render(linha)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Cartoes — abaixo de md */}
      {!tabelaCabe && (
      <div className="space-y-3" aria-busy={loading}>
        {loading &&
          Array.from({ length: skeletonRows }).map((_, i) => (
            <div
              key={i}
              className="border border-outline-variant rounded-xl p-4 space-y-3"
              aria-hidden="true"
            >
              <div className="h-4 w-32 rounded-md bg-surface-container animate-pulse motion-reduce:animate-none" />
              <div className="h-4 w-24 rounded-md bg-surface-container animate-pulse motion-reduce:animate-none" />
            </div>
          ))}
        {vazio && (
          <p className="p-8 text-center text-on-surface-variant text-sm">{emptyMessage}</p>
        )}
        {!loading &&
          visiveis.map((linha) => (
            <div
              key={rowKey(linha)}
              className="border border-outline-variant rounded-xl p-4 space-y-2 bg-surface-container-lowest"
            >
              {columns.map((coluna) => (
                <div
                  key={coluna.key}
                  className="flex items-start justify-between gap-4 text-sm"
                >
                  {!coluna.hideLabelOnMobile && (
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pt-1 shrink-0">
                      {coluna.header}
                    </span>
                  )}
                  <div className={cn("min-w-0", coluna.hideLabelOnMobile && "w-full")}>
                    {coluna.render(linha)}
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
      )}

      {/* Rodape: so aparece quando ha o que paginar */}
      {!loading && ordenadas.length > 0 && pageSize > 0 && paginas > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-outline-variant">
          <p className="text-xs text-on-surface-variant">
            Mostrando {intervalo.de}–{intervalo.ate} de {intervalo.total}
          </p>

          <nav className="flex items-center gap-1" aria-label="Paginação">
            <BotaoPagina
              onClick={() => setPagina(paginaAtual - 1)}
              disabled={paginaAtual === 1}
              ariaLabel="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </BotaoPagina>

            {janelaDePaginas(paginaAtual, paginas).map((p, i) =>
              p === null ? (
                <span key={`corte-${i}`} className="px-2 text-on-surface-variant" aria-hidden="true">
                  …
                </span>
              ) : (
                <BotaoPagina
                  key={p}
                  onClick={() => setPagina(p)}
                  ativa={p === paginaAtual}
                  ariaLabel={`Página ${p}`}
                  ariaCurrent={p === paginaAtual}
                >
                  {p}
                </BotaoPagina>
              ),
            )}

            <BotaoPagina
              onClick={() => setPagina(paginaAtual + 1)}
              disabled={paginaAtual === paginas}
              ariaLabel="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </BotaoPagina>
          </nav>
        </div>
      )}
    </div>
  );
}

function BotaoPagina({
  children,
  onClick,
  disabled,
  ativa,
  ariaLabel,
  ariaCurrent,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ativa?: boolean;
  ariaLabel: string;
  ariaCurrent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent ? "page" : undefined}
      className={cn(
        "min-w-8 h-8 px-2 rounded-lg text-xs font-semibold transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        ativa
          ? "bg-primary-container text-white"
          : "text-on-surface-variant hover:bg-surface-container",
      )}
    >
      {children}
    </button>
  );
}

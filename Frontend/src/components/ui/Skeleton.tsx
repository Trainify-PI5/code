import { cn } from "../../lib/utils";

/**
 * Bloco cinza que ocupa o lugar do conteudo enquanto ele carrega.
 *
 * Um spinner diz "estou ocupado"; o esqueleto diz "e isto que vem", e a tela
 * nao salta quando os dados chegam. Por isso a forma aqui precisa imitar o
 * conteudo real — mesma altura, mesma largura aproximada, mesma contagem.
 *
 * E decorativo: fica escondido dos leitores de tela, que devem ouvir o estado
 * pelo aria-busy de quem contem a lista.
 */
export interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="skeleton"
      className={cn(
        "animate-pulse rounded-md bg-surface-container motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/** Algumas linhas de texto. A ultima sai mais curta, como um paragrafo real. */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/**
 * Linhas de tabela. Devolve <tr> soltos de proposito, para entrarem direto no
 * <tbody> — um <div> ali dentro seria HTML invalido.
 * A primeira coluna vem mais larga, que e onde costuma ficar o nome.
 *
 * `avatar` existe porque a altura precisa bater: numa tabela com foto, nome e
 * e-mail empilhados a linha real tem ~77px, contra 48px de uma linha de texto
 * simples. Sem isso a tela dava um salto de quase 150px quando os dados
 * chegavam — o oposto do que o esqueleto serve para resolver.
 */
export function SkeletonTableRows({
  rows = 5,
  columns = 4,
  avatar = false,
  className,
}: {
  rows?: number;
  columns?: number;
  avatar?: boolean;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, linha) => (
        <tr key={linha} className={className} data-testid="skeleton-row">
          {Array.from({ length: columns }).map((_, coluna) =>
            coluna === 0 && avatar ? (
              <td key={coluna} className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="space-y-2 min-w-0">
                    <Skeleton className="h-4 w-28 max-w-full" />
                    <Skeleton className="h-3 w-40 max-w-full" />
                  </div>
                </div>
              </td>
            ) : (
              <td key={coluna} className="p-4">
                <Skeleton
                  className={cn("h-4", coluna === 0 ? "w-40 max-w-full" : "w-20 max-w-full")}
                />
              </td>
            ),
          )}
        </tr>
      ))}
    </>
  );
}

/** Cartao com imagem, titulo e duas linhas — o formato usado na lista de cursos. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden",
        className,
      )}
    >
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

/** Uma grade de cartoes, para a lista inteira nao pular quando os dados chegam. */
export function SkeletonCards({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className={className} />
      ))}
    </>
  );
}

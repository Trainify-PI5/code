/** Dispara o download de um Blob no navegador, liberando a URL temporaria. */
export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Monta um CSV que o Excel em pt-BR abre certo: separador ";" (porque a
 * virgula e decimal) e BOM no inicio (senao os acentos saem quebrados).
 */
export function montarCSV(colunas: string[], linhas: (string | number | null | undefined)[][]) {
  const escapar = (valor: unknown) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
  const corpo = [colunas, ...linhas].map((linha) => linha.map(escapar).join(";"));
  return String.fromCharCode(0xfeff) + corpo.join("\r\n");
}

export function baixarCSV(
  nomeArquivo: string,
  colunas: string[],
  linhas: (string | number | null | undefined)[][],
) {
  const csv = montarCSV(colunas, linhas);
  baixarBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), nomeArquivo);
}

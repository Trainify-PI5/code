import { Fragment, type ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import type { FonteIa } from '../lib/iaChat';

/**
 * Markdown basico das respostas da IA: paragrafos, negrito, italico, listas,
 * titulos e tabelas. Tudo vira elemento React (nunca innerHTML), entao o texto
 * que vem do modelo nao consegue injetar HTML na pagina.
 */

const LINHA_TABELA = /^\s*\|.*\|\s*$/;
const SEPARADOR_TABELA = /^\s*\|[\s:|-]+\|\s*$/;
const ITEM_LISTA = /^\s*([-*•]|\d+[.)])\s+/;
const TITULO = /^\s*#{1,6}\s+/;
const REGUA = /^\s*(-{3,}|\*{3,})\s*$/;
const CITACAO = /^\s*>\s?/;

function inline(texto: string, chave: string): ReactNode[] {
  // Quebras <br> que os modelos usam dentro de tabelas
  const partes = texto.split(/<br\s*\/?>/i);
  return partes.flatMap((parte, i) => {
    const nos: ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])/g;
    let ultimo = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(parte))) {
      if (m.index > ultimo) nos.push(parte.slice(ultimo, m.index));
      nos.push(m[1] !== undefined
        ? <strong key={`${chave}-${i}-${m.index}`}>{m[1]}</strong>
        : <em key={`${chave}-${i}-${m.index}`}>{m[2]}</em>);
      ultimo = m.index + m[0].length;
    }
    if (ultimo < parte.length) nos.push(parte.slice(ultimo));
    return i < partes.length - 1 ? [...nos, <br key={`${chave}-br-${i}`} />] : nos;
  });
}

const celulas = (linha: string) => linha.trim().slice(1, -1).split('|').map((c) => c.trim());

export function renderMarkdown(texto: string): ReactNode[] {
  const linhas = texto.replace(/\r/g, '').split('\n');
  const blocos: ReactNode[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];
    const k = `b${i}`;

    if (LINHA_TABELA.test(linha)) {
      const bloco: string[] = [];
      while (i < linhas.length && LINHA_TABELA.test(linhas[i])) bloco.push(linhas[i++]);
      const [cabecalho, ...corpo] = bloco.filter((l) => !SEPARADOR_TABELA.test(l));
      blocos.push(
        <div key={k} className="overflow-x-auto my-2">
          <table className="text-xs border-collapse">
            <thead>
              <tr>{celulas(cabecalho).map((c, j) => (
                <th key={j} className="border border-outline-variant px-2 py-1 text-left bg-surface-container">{inline(c, `${k}h${j}`)}</th>
              ))}</tr>
            </thead>
            <tbody>
              {corpo.map((l, r) => (
                <tr key={r}>{celulas(l).map((c, j) => (
                  <td key={j} className="border border-outline-variant px-2 py-1 align-top">{inline(c, `${k}${r}${j}`)}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (ITEM_LISTA.test(linha)) {
      const ordenada = /^\s*\d+[.)]/.test(linha);
      const itens: string[] = [];
      while (i < linhas.length && ITEM_LISTA.test(linhas[i])) itens.push(linhas[i++].replace(ITEM_LISTA, ''));
      const Lista = ordenada ? 'ol' : 'ul';
      blocos.push(
        <Lista key={k} className={`${ordenada ? 'list-decimal' : 'list-disc'} pl-5 my-1 space-y-1`}>
          {itens.map((item, j) => <li key={j}>{inline(item, `${k}${j}`)}</li>)}
        </Lista>,
      );
      continue;
    }

    if (TITULO.test(linha)) {
      blocos.push(<p key={k} className="font-semibold mt-2">{inline(linha.replace(TITULO, ''), k)}</p>);
      i++;
      continue;
    }

    if (CITACAO.test(linha)) {
      const citacao: string[] = [];
      while (i < linhas.length && CITACAO.test(linhas[i])) citacao.push(linhas[i++].replace(CITACAO, ''));
      blocos.push(
        <blockquote key={k} className="border-l-2 border-outline-variant pl-3 my-2 text-on-surface-variant">
          {citacao.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l, `${k}${j}`)}</Fragment>)}
        </blockquote>,
      );
      continue;
    }

    if (REGUA.test(linha)) {
      blocos.push(<hr key={k} className="my-2 border-outline-variant" />);
      i++;
      continue;
    }

    if (!linha.trim()) {
      i++;
      continue;
    }

    const paragrafo: string[] = [];
    while (
      i < linhas.length && linhas[i].trim()
      && !LINHA_TABELA.test(linhas[i]) && !ITEM_LISTA.test(linhas[i]) && !TITULO.test(linhas[i]) && !REGUA.test(linhas[i])
      && !CITACAO.test(linhas[i])
    ) {
      paragrafo.push(linhas[i++]);
    }
    blocos.push(
      <p key={k} className="my-1">
        {paragrafo.map((l, j) => (
          <Fragment key={j}>{j > 0 && <br />}{inline(l, `${k}${j}`)}</Fragment>
        ))}
      </p>,
    );
  }
  return blocos;
}

export default function MarkdownText({ text, sources }: { text: string; sources?: FonteIa[] }) {
  // Varias fontes podem ser da mesma aula; mostra cada aula uma vez
  const aulas = Array.from(new Map((sources ?? []).map((s) => [s.lessonId, s])).values());

  return (
    <div className="break-words">
      {renderMarkdown(text)}
      {aulas.length > 0 && (
        <div className="mt-3 pt-2 border-t border-outline-variant/60 flex flex-wrap gap-1.5" aria-label="Fontes da resposta">
          {aulas.map((s) => (
            <span key={s.lessonId} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
              <BookOpen className="w-3 h-3" aria-hidden="true" />
              {s.lessonTitle || 'Aula do curso'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Utilitário partilhado de pesquisa inteligente e dinâmica para tabelas do RedUCM.
 * Suporta:
 * 1. Insensibilidade a maiúsculas/minúsculas.
 * 2. Normalização de diacríticos e acentos (ex: 'validação' encontra 'validacao' e vice-versa).
 * 3. Pesquisa multi-palavra (tokens): encontra resultados onde todas as palavras estejam presentes
 *    em qualquer campo do item.
 * 4. Extração segura de texto a partir de arrays, objetos e valores numéricos.
 */

export function normalizeSearchText(value: any): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function tokenizeQuery(query: string): string[] {
  if (!query || !query.trim()) return [];
  const normalized = normalizeSearchText(query);
  return normalized.split(/\s+/).filter((t) => t.length > 0);
}

export function smartMatchTokens(tokens: string[], preNormalizedCorpus: string): boolean {
  if (!tokens || tokens.length === 0) return true;
  return tokens.every((token) => preNormalizedCorpus.includes(token));
}

export function smartMatch(
  corpus: (string | number | boolean | null | undefined)[] | string,
  query: string,
): boolean {
  if (!query || !query.trim()) return true;

  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return true;

  let fullCorpus: string;
  if (Array.isArray(corpus)) {
    fullCorpus = corpus
      .filter((c) => c !== null && c !== undefined)
      .map((c) => normalizeSearchText(c))
      .join(' ');
  } else {
    fullCorpus = normalizeSearchText(corpus);
  }

  // Cada palavra pesquisada deve existir algures no conjunto de campos
  return tokens.every((token) => fullCorpus.includes(token));
}


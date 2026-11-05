import { normalizarTexto } from './normalizarTexto.js';

const PADROES = [
  { nome: 'ignorar_instrucoes', regex: /\b(ignore|ignora|ignorar|desconsidere|desconsiderar|esqueca|esquecer)\b.{0,40}\b(instrucoes|instrucao|regras|orientacoes|prompt|comandos)\b/ },
  { nome: 'ignore_instructions', regex: /\b(ignore|disregard|forget)\b.{0,40}\b(instructions|rules|prompt)\b/ },
  { nome: 'pedir_nota', regex: /\b(atribua|atribuir|conceda|coloque|registre|marque)\b.{0,40}\b(nota|aderencia|score|pontuacao)\b.{0,25}(\bmaxima\b|\bmaximo\b|\b1(\.0)?\b|\b100\b|\btotal\b|\bcheia\b)/ },
  { nome: 'ask_score', regex: /\b(give|assign|set|rate)\b.{0,40}(\b(score|rating|adherence|grade)\b.{0,25}(\b1(\.0)?\b|\b100\b|\bmax\b|\bmaximum\b|\bfull\b|\bperfect\b)|\b(perfect|maximum|full)\b.{0,10}\b(score|rating|grade)\b)/ },
  { nome: 'aderencia_literal', regex: /\baderencia\s*[:=]?\s*1(\.0)?\b(?!\s*ano)/ },
  { nome: 'json_resposta', regex: /"(criterioid|aderencia|criterios|tentativamanipulacao)"\s*:/ },
  { nome: 'tag_delimitador', regex: /<\/?\s*(curriculo|respostas_questionario|vaga|data_referencia|system|sistema|instrucoes[a-z_]*)\s*>/ },
  { nome: 'troca_de_papel', regex: /\b(voce agora e|a partir de agora voce|you are now|act as)\b/ },
  { nome: 'prompt_do_sistema', regex: /\b(system prompt|prompt do sistema|instrucoes do sistema)\b/ },
  { nome: 'ordem_ao_avaliador', regex: /\b(avaliador|avaliadora|o modelo|a ia)\b.{0,30}\b(deve|precisa|tem que)\b.{0,50}\b(aprovar|aprovado|aprovada|aderencia|atendidos?|atendidas?|todos os criterios)\b/ },
];

const COMPACTOS = [
  { nome: 'ignorar_instrucoes_ofuscado', alvo: 'ignoreasinstrucoes' },
  { nome: 'ignore_instructions_ofuscado', alvo: 'ignorepreviousinstructions' },
  { nome: 'ignore_instructions_ofuscado', alvo: 'ignoreallpreviousinstructions' },
];

const LIMITE_TRECHO = 300;

const camposDoCandidato = (curriculo, questionario) => {
  const c = curriculo ?? {};
  return [
    ...(c.habilidades ?? []).map((h, i) => [`habilidades[${i}].habilidade`, h?.habilidade]),
    ...(c.formacoes ?? []).flatMap((f, i) => [
      [`formacoes[${i}].curso`, f?.curso],
      [`formacoes[${i}].instituicao`, f?.instituicao],
    ]),
    ...(c.experiencias ?? []).flatMap((e, i) => [
      [`experiencias[${i}].cargo`, e?.cargo],
      [`experiencias[${i}].empresa`, e?.empresa],
      [`experiencias[${i}].descricaoAtivida_`, e?.descricaoAtivida_],
    ]),
    ...(c.certificacoes ?? []).flatMap((cert, i) => [
      [`certificacoes[${i}].nome`, cert?.nome],
      [`certificacoes[${i}].emissor`, cert?.emissor],
    ]),
    ...(questionario?.respostas ?? []).map((r, i) => [`respostas[${i}].textoResposta`, r?.textoResposta]),
  ].filter(([, texto]) => typeof texto === 'string' && texto.trim());
};

const padraoEncontrado = (texto) => {
  const normalizado = normalizarTexto(texto);
  const porRegex = PADROES.find(({ regex }) => regex.test(normalizado));
  if (porRegex) return porRegex.nome;
  const compacto = normalizado.replace(/[^a-z0-9]/g, '');
  return COMPACTOS.find(({ alvo }) => compacto.includes(alvo))?.nome ?? null;
};

export const detectarInjecao = (curriculo, questionario) =>
  camposDoCandidato(curriculo, questionario).flatMap(([campo, texto]) => {
    const padrao = padraoEncontrado(texto);
    return padrao ? [{ campo, padrao, trecho: texto.trim().slice(0, LIMITE_TRECHO) }] : [];
  });

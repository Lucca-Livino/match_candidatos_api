// Gate deterministico: um criterio obrigatorio precisa ter correspondencia
// textual em algum item do curriculo do tipo correspondente. Deliberadamente
// permissivo — a avaliacao fina de aderencia e feita pelo LLM depois.

const normalizar = (valor) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const CAMPOS_POR_TIPO = {
  skill_tecnica: (curriculo) => (curriculo.habilidades || []).map((h) => h.habilidade),
  formacao: (curriculo) =>
    (curriculo.formacoes || []).flatMap((f) => [f.curso, f.grau, f.instituicao]),
  // descricaoAtivida_ e o nome do campo no model Experiencia.
  experiencia: (curriculo) =>
    (curriculo.experiencias || []).flatMap((e) => [e.cargo, e.empresa, e.descricaoAtivida_]),
  certificacao: (curriculo) =>
    (curriculo.certificacoes || []).flatMap((c) => [c.nome, c.emissor]),
};

const possuiCorrespondencia = (criterio, curriculo) => {
  const extrair = CAMPOS_POR_TIPO[criterio.tipo_criterio];
  if (!extrair) return false;

  const alvo = normalizar(criterio.nome);
  if (!alvo) return false;

  return extrair(curriculo)
    .map(normalizar)
    .filter(Boolean)
    .some((valor) => valor.includes(alvo) || alvo.includes(valor));
};

export const avaliarObrigatorios = (criterios = [], curriculo = {}) => {
  const faltantes = (criterios || [])
    .filter((c) => c.obrigatorio)
    .filter((c) => !possuiCorrespondencia(c, curriculo))
    .map((c) => c.nome);

  return { aprovado: faltantes.length === 0, faltantes };
};

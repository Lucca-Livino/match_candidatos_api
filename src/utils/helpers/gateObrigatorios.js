// Gate deterministico dos criterios obrigatorios. Confere o perfil contra o
// catalogo: item, sinonimo exato ou item que implica o exigido.
import { TIPO_CATALOGO_POR_CRITERIO } from '../../models/ItemCatalogo.js';
import { NIVEIS_HABILIDADE } from '../../models/Habilidade.js';
import { GRAUS_ACADEMICOS } from '../../models/Formacao.js';
import { resolver, expandir } from './indiceCatalogo.js';

const posicao = (lista, valor) => lista.indexOf(valor);

// O motivo vai para o painel do suporte: nivel por extenso, nao a chave do enum.
const ROTULO_NIVEL = {
  basico: 'básico',
  intermediario: 'intermediário',
  avancado: 'avançado',
  especialista: 'especialista',
};

// Ids que um item do perfil comprova: o item resolvido mais o que ele implica.
const comprova = (indice, tipo, ref) => expandir(indice, [resolver(indice, tipo, ref)]);

const verificarHabilidade = (criterio, curriculo, indice) => {
  const { itemId, nivelMinimo } = criterio.requisito;
  const candidatas = (curriculo.habilidades || []).filter((h) =>
    comprova(indice, 'habilidade', { id: h.itemId, texto: h.habilidade }).has(itemId),
  );
  if (candidatas.length === 0) return `${criterio.nome}: não encontrado no perfil.`;
  if (!nivelMinimo) return null;

  const melhor = candidatas.reduce((a, b) =>
    posicao(NIVEIS_HABILIDADE, b.nivel) > posicao(NIVEIS_HABILIDADE, a.nivel) ? b : a,
  );
  return posicao(NIVEIS_HABILIDADE, melhor.nivel) >= posicao(NIVEIS_HABILIDADE, nivelMinimo)
    ? null
    : `${criterio.nome}: nível mínimo ${ROTULO_NIVEL[nivelMinimo] ?? nivelMinimo}, declarado ${
      ROTULO_NIVEL[melhor.nivel] ?? 'não informado'
    }.`;
};

const verificarFormacao = (criterio, curriculo, indice) => {
  const { grauMinimo, areaId, aceitaCursando } = criterio.requisito;
  const situacoes = aceitaCursando ? ['concluido', 'cursando'] : ['concluido'];
  const atende = (curriculo.formacoes || []).some(
    (f) =>
      situacoes.includes(f.situacao)
      && posicao(GRAUS_ACADEMICOS, f.grau) >= posicao(GRAUS_ACADEMICOS, grauMinimo)
      && (!areaId || comprova(indice, 'area_curso', { id: f.areaId, texto: f.curso }).has(areaId)),
  );
  return atende ? null : `${criterio.nome}: nenhuma formação atende ao grau, à área e à situação exigidos.`;
};

const verificarExperiencia = (criterio, curriculo, indice) => {
  const { areaId, mesesMinimos = 0 } = criterio.requisito;
  const daArea = (curriculo.experiencias || []).filter((e) =>
    comprova(indice, 'area_atuacao', { id: e.areaId, texto: e.cargo }).has(areaId),
  );
  if (daArea.length === 0) return `${criterio.nome}: não encontrado no perfil.`;

  const meses = daArea.reduce((soma, e) => soma + (Number(e.mesesDuracao) || 0), 0);
  return meses >= mesesMinimos
    ? null
    : `${criterio.nome}: mínimo de ${mesesMinimos} meses na área, encontrados ${meses}.`;
};

const verificarCertificacao = (criterio, curriculo, indice) => {
  const atende = (curriculo.certificacoes || []).some((c) =>
    comprova(indice, 'certificacao', { id: c.itemId, texto: c.nome }).has(criterio.requisito.itemId),
  );
  return atende ? null : `${criterio.nome}: não encontrado no perfil.`;
};

const VERIFICADORES = {
  skill_tecnica: verificarHabilidade,
  formacao: verificarFormacao,
  experiencia: verificarExperiencia,
  certificacao: verificarCertificacao,
};

// O validador da vaga ja recusa requisito incompleto; isto e so defesa para
// dado gravado por outro caminho. Incompleto e tratado como legado: a IA julga.
export const requisitoCompleto = (criterio) => {
  const r = criterio.requisito;
  switch (criterio.tipo_criterio) {
    case 'skill_tecnica':
      return Boolean(r.itemId)
        && (r.nivelMinimo == null || NIVEIS_HABILIDADE.includes(r.nivelMinimo));
    case 'certificacao':
      return Boolean(r.itemId);
    case 'experiencia':
      return Boolean(r.areaId);
    case 'formacao':
      return GRAUS_ACADEMICOS.includes(r.grauMinimo);
    default:
      return false;
  }
};

export const avaliarObrigatorios = (criterios = [], curriculo = {}, indice) => {
  const faltantes = [];
  const motivos = [];

  for (const criterio of criterios || []) {
    // Obrigatorio sem requisito so existe em dado anterior ao catalogo: o
    // validador da vaga ja o recusa. Nao barra aqui, a IA julga.
    if (!criterio.obrigatorio || !criterio.requisito) continue;
    if (!TIPO_CATALOGO_POR_CRITERIO[criterio.tipo_criterio]) continue;
    if (!requisitoCompleto(criterio)) continue;

    const motivo = VERIFICADORES[criterio.tipo_criterio](criterio, curriculo, indice);
    if (motivo) {
      faltantes.push(criterio.nome);
      motivos.push(motivo);
    }
  }

  return { aprovado: faltantes.length === 0, faltantes, motivos };
};

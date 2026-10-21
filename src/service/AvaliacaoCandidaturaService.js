import AvaliacaoPayloadService from './AvaliacaoPayloadService.js';
import MatchIAService from './MatchIAService.js';
import ConfiguracaoIntegracaoService from './ConfiguracaoIntegracaoService.js';
import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import { avaliarObrigatorios } from '../utils/helpers/gateObrigatorios.js';
import { montarIndice } from '../utils/helpers/indiceCatalogo.js';
import { calcularScore, detalharCriterios } from '../utils/helpers/calcularScore.js';

// Retorno de `avaliar` quando a vaga nao tem criterio: nada foi gravado, mas
// por regra, e nao por falha. Distinto do null para a reavaliacao manual nao
// responder como se a IA estivesse fora.
export const SEM_CRITERIOS = Object.freeze({ semCriterios: true });

class AvaliacaoCandidaturaService {
  constructor(
    payloadService = new AvaliacaoPayloadService(),
    matchIAService = new MatchIAService(),
    configuracaoService = new ConfiguracaoIntegracaoService(),
    candidaturaRepository = new CandidaturaRepository(),
  ) {
    this.payloadService = payloadService;
    this.matchIAService = matchIAService;
    this.configuracaoService = configuracaoService;
    this.candidaturaRepository = candidaturaRepository;
  }

  async persistir(usuarioId, vagaId, dados) {
    return this.candidaturaRepository.atualizarPorUsuarioEVaga(usuarioId, vagaId, dados);
  }

  async promoverSeCompativel(usuarioId, vagaId, aprovado) {
    if (!aprovado) return {};

    const atual = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, vagaId);
    if (atual?.status !== 'inscrito') return {};

    return { status: 'em_analise', movidoPor: 'ia' };
  }

  async avaliar(usuarioId, vagaId) {
    const config = await this.configuracaoService.obter();

    // Kill switch do suporte: nao avalia, deixa pendente para reprocessar depois.
    if (!config.ativo) return null;

    const payload = await this.payloadService.montar(usuarioId, vagaId);

    // Vaga sem criterio nao tem o que pontuar: calcularScore daria 0 e a
    // triagem reprovaria todo mundo. Deixa pendente, sem nota e sem chamada a
    // IA; o recrutador move a candidatura manualmente.
    if (payload.vaga.criterios.length === 0) return SEM_CRITERIOS;

    // Gate deterministico contra o catalogo: criterio obrigatorio sem
    // comprovacao barra sem gastar chamada. Payload sem `verificacao` (montado
    // fora do AvaliacaoPayloadService) nao tem o que conferir e segue para a IA.
    const verificacao = payload.verificacao ?? { criterios: [], curriculo: {}, indice: montarIndice([]) };
    const gate = avaliarObrigatorios(verificacao.criterios, verificacao.curriculo, verificacao.indice);
    if (!gate.aprovado) {
      const motivos = gate.motivos.join(' ');
      return this.persistir(usuarioId, vagaId, {
        compativel: 0,
        scoreIA: 0,
        limiteAplicado: config.limiteCompatibilidade,
        versaoModelo: null,
        avaliadoEm: new Date(),
        justificativa: (
          'Reprovado pela verificação automática de requisitos obrigatórios, sem consulta ao '
          + `modelo de IA. ${motivos}`).slice(0, 4000),
        motivoIncompat_: `Requisito obrigatório não atendido: ${motivos}`.slice(0, 500),
        // Sem chamada ao modelo nao ha nota por criterio; limpa a de uma
        // avaliacao anterior para o registro nao misturar as duas.
        criteriosAvaliados: [],
        movidoPor: 'sistema',
      });
    }

    let resultado;
    try {
      resultado = await this.matchIAService.avaliar(payload, {
        provedor: config.provedor,
        cascata: config.cascata,
        temperatura: config.temperatura,
      });
    } catch (error) {
      console.error('[avaliacao] falha na IA', {
        usuarioId,
        vagaId,
        erro: error.message,
        detalhes: error.details ?? null,
      });
      return null;
    }

    // O modelo da a nota por criterio; a combinacao pelos pesos e feita aqui.
    const score = calcularScore(payload.vaga.criterios, resultado.criterios);
    const aprovado = score >= config.limiteCompatibilidade;
    const promocao = await this.promoverSeCompativel(usuarioId, vagaId, aprovado);

    return this.persistir(usuarioId, vagaId, {
      compativel: aprovado ? 1 : 0,
      scoreIA: score,
      limiteAplicado: config.limiteCompatibilidade,
      versaoModelo: `${config.provedor}/${resultado.modeloUsado}`,
      avaliadoEm: new Date(),
      justificativa: resultado.resumo,
      criteriosAvaliados: detalharCriterios(payload.vaga.criterios, resultado.criterios).map((c) => ({
        ...c,
        evidencia: c.evidencia.slice(0, 2000),
      })),
      motivoIncompat_: aprovado
        ? ''
        : 'Compatibilidade abaixo do limiar definido para a triagem automática.',
      movidoPor: 'sistema',
      ...promocao,
    });
  }
}

export default AvaliacaoCandidaturaService;

import AvaliacaoPayloadService from './AvaliacaoPayloadService.js';
import MatchIAService from './MatchIAService.js';
import ConfiguracaoIntegracaoService from './ConfiguracaoIntegracaoService.js';
import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import { avaliarObrigatorios } from '../utils/helpers/gateObrigatorios.js';

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

    // Gate deterministico: criterio obrigatorio sem evidencia reprova sem gastar chamada.
    const gate = avaliarObrigatorios(payload.vaga.criterios, payload.curriculo);
    if (!gate.aprovado) {
      const faltantes = gate.faltantes.join(', ');

      return this.persistir(usuarioId, vagaId, {
        compativel: 0,
        scoreIA: 0,
        limiteAplicado: config.limiteCompatibilidade,
        versaoModelo: null,
        avaliadoEm: new Date(),
        justificativa:
          'Reprovado pela verificacao automatica de requisitos obrigatorios, sem consulta ao '
          + `modelo de IA. O curriculo nao apresenta evidencia para: ${faltantes}.`,
        motivoIncompat_: `Requisito obrigatorio nao atendido: ${faltantes}.`,
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

    const aprovado = resultado.score >= config.limiteCompatibilidade;
    const promocao = await this.promoverSeCompativel(usuarioId, vagaId, aprovado);

    return this.persistir(usuarioId, vagaId, {
      compativel: aprovado ? 1 : 0,
      scoreIA: resultado.score,
      limiteAplicado: config.limiteCompatibilidade,
      versaoModelo: `${config.provedor}/${resultado.modeloUsado}`,
      avaliadoEm: new Date(),
      justificativa: resultado.resumo,
      motivoIncompat_: aprovado
        ? ''
        : 'Compatibilidade abaixo do limiar definido para a triagem automatica.',
      movidoPor: 'sistema',
      ...promocao,
    });
  }
}

export default AvaliacaoCandidaturaService;

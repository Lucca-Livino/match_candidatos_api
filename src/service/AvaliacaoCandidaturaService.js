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

  async avaliar(usuarioId, vagaId) {
    const config = await this.configuracaoService.obter();

    // Kill switch do suporte: nao avalia, deixa pendente para reprocessar depois.
    if (!config.ativo) return null;

    const payload = await this.payloadService.montar(usuarioId, vagaId);

    // Gate deterministico: criterio obrigatorio sem evidencia reprova sem gastar chamada.
    const gate = avaliarObrigatorios(payload.vaga.criterios, payload.curriculo);
    if (!gate.aprovado) {
      return this.persistir(usuarioId, vagaId, {
        compativel: 0,
        scoreIA: 0,
        limiteAplicado: config.limiteCompatibilidade,
        versaoModelo: null,
        avaliadoEm: new Date(),
        justificativa: '',
        motivoIncompat_: `Requisito obrigatorio nao atendido: ${gate.faltantes.join(', ')}.`,
        movidoPor: 'sistema',
      });
    }

    let resultado;
    try {
      resultado = await this.matchIAService.avaliar(payload, {
        provedor: config.provedor,
        // A cascata inteira, nao um modelo: qual degrau responde e decisao de
        // runtime, tomada pelo estado da cota, e nao daqui.
        cascata: config.cascata,
        temperatura: config.temperatura,
      });
    } catch (error) {
      // Falha da IA nao reprova ninguem: candidatura fica pendente
      // (avaliadoEm null) e pode ser reprocessada.
      console.error('[avaliacao] falha na IA', { usuarioId, vagaId, erro: error.message });
      return null;
    }

    const aprovado = resultado.score >= config.limiteCompatibilidade;

    return this.persistir(usuarioId, vagaId, {
      compativel: aprovado ? 1 : 0,
      scoreIA: resultado.score,
      limiteAplicado: config.limiteCompatibilidade,
      // Provedor + modelo que DE FATO respondeu (`resultado.modeloUsado`), nao
      // o primeiro degrau da configuracao. Com cascata, a diferenca e o ponto
      // inteiro: duas candidaturas avaliadas na mesma rodada podem ter caido
      // em modelos diferentes se a cota do principal acabou no meio. Gravar o
      // topo da cascata registraria uma avaliacao que nao aconteceu.
      versaoModelo: `${config.provedor}/${resultado.modeloUsado}`,
      avaliadoEm: new Date(),
      justificativa: resultado.resumo,
      motivoIncompat_: aprovado
        ? ''
        : 'Compatibilidade abaixo do limiar definido para a triagem automatica.',
      movidoPor: 'sistema',
    });
  }
}

export default AvaliacaoCandidaturaService;

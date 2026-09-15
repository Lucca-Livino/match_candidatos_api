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

  // Candidatura compativel e PRE-APROVADA: entra na fila do recrutador ja em
  // 'em_analise'. O resultado da triagem chega ao recrutador como acao, nao
  // como rotulo — ele nunca ve o score nem o veredito, so a fila.
  //
  // So promove quem esta em 'inscrito'. Uma reavaliacao de candidatura ja
  // aprovada/reprovada nao pode puxar o registro de volta: a decisao humana
  // vale mais que a da IA, e regredir status apagaria o trabalho do recrutador.
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
    const promocao = await this.promoverSeCompativel(usuarioId, vagaId, aprovado);

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
      // Por ultimo: quando houve promocao, o `movidoPor: 'ia'` daqui precisa
      // vencer o 'sistema' acima, senao a trilha de auditoria mente sobre
      // quem moveu a candidatura de fila.
      ...promocao,
    });
  }
}

export default AvaliacaoCandidaturaService;

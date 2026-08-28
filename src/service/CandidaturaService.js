import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import AvaliacaoCandidaturaService from './AvaliacaoCandidaturaService.js';
import AppError from '../utils/helpers/AppError.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';

class CandidaturaService {
  constructor(
    candidaturaRepository = new CandidaturaRepository(),
    avaliacaoCandidaturaService = new AvaliacaoCandidaturaService(),
  ) {
    this.candidaturaRepository = candidaturaRepository;
    this.avaliacaoCandidaturaService = avaliacaoCandidaturaService;
  }

  sanitize(doc) {
    return sanitizeDoc(doc);
  }

  // O score bruto e o limiar aplicado sao registro interno de auditoria:
  // ficam no banco para a calibracao do modelo e nunca saem pela API. Expor
  // o numero devolveria pela porta dos fundos o ranking que a triagem sem
  // ordenacao por score existe para evitar.
  omitirScore(candidatura) {
    if (!candidatura) return candidatura;
    const { scoreIA, limiteAplicado, ...visivel } = candidatura;
    return visivel;
  }

  validarTransicaoStatus(statusAtual, novoStatus) {
    const fluxo = {
      inscrito: ['em_analise'],
      em_analise: ['aprovado', 'reprovado'],
      aprovado: [],
      reprovado: [],
    };

    const permitidos = fluxo[statusAtual] || [];
    if (!permitidos.includes(novoStatus)) {
      throw new AppError(
        `Transicao de status invalida: ${statusAtual} -> ${novoStatus}.`,
        400,
        'BUSINESS_RULE_ERROR',
      );
    }
  }

  async criarCandidatura(usuarioId, payload) {
    const jaExiste = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, payload.vagaId);
    if (jaExiste) {
      throw new AppError('Usuario ja esta inscrito nesta vaga.', 409, 'CONFLICT');
    }

    const created = await this.candidaturaRepository.criar({
      ...payload,
      usuarioId,
      status: 'inscrito',
    });

    return this.sanitize(created.toObject());
  }

  async listarCandidatura(usuarioId) {
    const list = await this.candidaturaRepository.listarPorUsuarioId(usuarioId);
    return list.map((item) => this.omitirScore(this.sanitize(item)));
  }

  // Listagem do recrutador: quem se candidatou a esta vaga, em ordem de
  // inscricao. Sem score e sem ranking — apenas apto/nao apto.
  async listarPorVaga(vagaId) {
    const list = await this.candidaturaRepository.listarPorVagaId(vagaId);
    return list.map((item) => this.omitirScore(this.sanitize(item)));
  }

  async detalharCandidatura(usuarioId, vagaId) {
    const candidatura = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, vagaId);
    if (!candidatura) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    return this.omitirScore(this.sanitize(candidatura));
  }

  async atualizarStatusCandidatura(usuarioId, vagaId, payload) {
    const candidatura = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, vagaId);
    if (!candidatura) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    this.validarTransicaoStatus(candidatura.status, payload.status);

    const updated = await this.candidaturaRepository.atualizarPorUsuarioEVaga(
      usuarioId,
      vagaId,
      payload,
    );
    return this.omitirScore(this.sanitize(updated));
  }

  // Reprocessamento manual: a Task 12 dispara a avaliacao em fire-and-forget,
  // entao uma queda no meio deixa a candidatura com `avaliadoEm: null`. Este
  // e o caminho de volta.
  async reavaliarCandidatura(usuarioId, vagaId) {
    const candidatura = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, vagaId);
    if (!candidatura) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    // `avaliar` devolve null no kill switch e na falha da IA. Nos dois casos
    // nada foi gravado: devolver 200 com o documento antigo faria a
    // reavaliacao parecer bem-sucedida.
    const atualizada = await this.avaliacaoCandidaturaService.avaliar(usuarioId, vagaId);
    if (!atualizada) {
      throw new AppError('Avaliacao por IA indisponivel.', 503, 'AI_UNAVAILABLE');
    }

    return this.omitirScore(this.sanitize(atualizada));
  }

  async cancelarCandidatura(usuarioId, vagaId) {
    const candidatura = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, vagaId);
    if (!candidatura) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    if (!['inscrito', 'em_analise'].includes(candidatura.status)) {
      throw new AppError(
        'Cancelamento permitido apenas para candidaturas inscrito ou em_analise.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }

    await this.candidaturaRepository.deletarPorUsuarioEVaga(usuarioId, vagaId);

    return {
      vagaId,
      cancelada: true,
    };
  }
}

export default CandidaturaService;

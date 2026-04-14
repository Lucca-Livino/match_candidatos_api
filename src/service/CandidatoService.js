import CandidatoRepository from '../repository/CandidatoRepository.js';
import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import FormacaoRepository from '../repository/FormacaoRepository.js';
import ExperienciaRepository from '../repository/ExperienciaRepository.js';
import HabilidadeRepository from '../repository/HabilidadeRepository.js';
import CertificacaoRepository from '../repository/CertificacaoRepository.js';
import AppError from '../utils/helpers/AppError.js';

class CandidatoService {
  constructor(
    repository = new CandidatoRepository(),
    formacaoRepository = new FormacaoRepository(),
    experienciaRepository = new ExperienciaRepository(),
    habilidadeRepository = new HabilidadeRepository(),
    certificacaoRepository = new CertificacaoRepository(),
    candidaturaRepository = new CandidaturaRepository(),
  ) {
    this.repository = repository;
    this.formacaoRepository = formacaoRepository;
    this.experienciaRepository = experienciaRepository;
    this.habilidadeRepository = habilidadeRepository;
    this.certificacaoRepository = certificacaoRepository;
    this.candidaturaRepository = candidaturaRepository;
  }

  sanitize(doc) {
    if (!doc) {
      return null;
    }

    const sanitized = { ...doc };
    delete sanitized.__v;
    return sanitized;
  }

  withCertificacaoExpirada(certificacao) {
    const now = new Date();
    const dataExpiracao = certificacao.dataExpiracao ? new Date(certificacao.dataExpiracao) : null;

    return {
      ...this.sanitize(certificacao),
      expirada: Boolean(dataExpiracao && dataExpiracao < now),
    };
  }

  async garantirCandidatoExiste(candidatoId) {
    const candidato = await this.repository.buscarCandidatoPorId(candidatoId);
    if (!candidato) {
      throw new AppError('Candidato nao encontrado.', 404, 'NOT_FOUND');
    }
    return candidato;
  }

  async listar(query) {
    const result = await this.repository.listarPaginado(query);

    return {
      ...result,
      docs: result.docs.map((item) => this.sanitize(item)),
    };
  }

  async buscarPorId(candidatoId) {
    const candidato = await this.garantirCandidatoExiste(candidatoId);

    const [formacao, experiencia, habilidade, certificacao] =
      await Promise.all([
        this.formacaoRepository.listarPorCandidatoId(candidatoId),
        this.experienciaRepository.listarPorCandidatoId(candidatoId),
        this.habilidadeRepository.listarPorCandidatoId(candidatoId),
        this.certificacaoRepository.listarPorCandidatoId(candidatoId),
      ]);

    return {
      ...this.sanitize(candidato),
      formacao: formacao.map((item) => this.sanitize(item)),
      experiencia: experiencia.map((item) => this.sanitize(item)),
      habilidade: habilidade.map((item) => this.sanitize(item)),
      certificacao: certificacao.map((item) => this.withCertificacaoExpirada(item)),
    };
  }

  async buscarPorFormacaoId(formacaoId) {
    const formacao = await this.formacaoRepository.buscarPorId(formacaoId);
    if (!formacao) {
      throw new AppError('Formacao nao encontrada.', 404, 'NOT_FOUND');
    }

    return this.buscarPorId(formacao.candidatoId);
  }

  async buscarPorExperienciaId(experienciaId) {
    const experiencia = await this.experienciaRepository.buscarPorId(experienciaId);
    if (!experiencia) {
      throw new AppError('Experiencia nao encontrada.', 404, 'NOT_FOUND');
    }

    return this.buscarPorId(experiencia.candidatoId);
  }

  async buscarPorHabilidadeId(habilidadeId) {
    const habilidade = await this.habilidadeRepository.buscarPorId(habilidadeId);
    if (!habilidade) {
      throw new AppError('Habilidade nao encontrada.', 404, 'NOT_FOUND');
    }

    return this.buscarPorId(habilidade.candidatoId);
  }

  async buscarPorCertificacaoId(certificacaoId) {
    const certificacao = await this.certificacaoRepository.buscarPorId(certificacaoId);
    if (!certificacao) {
      throw new AppError('Certificacao nao encontrada.', 404, 'NOT_FOUND');
    }

    return this.buscarPorId(certificacao.candidatoId);
  }

  async buscarPorCandidaturaId(candidaturaId) {
    const candidatura = await this.candidaturaRepository.buscarPorId(candidaturaId);
    if (!candidatura) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    return this.buscarPorId(candidatura.candidatoId);
  }

  async criar(payload) {
    const emailEmUso = await this.repository.buscarCandidatoPorEmail(payload.email);
    if (emailEmUso) {
      throw new AppError('Ja existe candidato com este email.', 409, 'CONFLICT');
    }

    const created = await this.repository.criarCandidato(payload);
    return this.sanitize(created.toObject());
  }

  async atualizar(candidatoId, payload) {
    const existente = await this.garantirCandidatoExiste(candidatoId);

    if (payload.email && payload.email !== existente.email) {
      const emailEmUso = await this.repository.buscarCandidatoPorEmail(payload.email);
      if (emailEmUso && emailEmUso.id !== candidatoId) {
        throw new AppError('Ja existe candidato com este email.', 409, 'CONFLICT');
      }
    }

    const updated = await this.repository.atualizarCandidato(candidatoId, payload);
    return this.sanitize(updated);
  }

  async deletar(candidatoId) {
    await this.garantirCandidatoExiste(candidatoId);

    const candidaturasBloqueantes = await this.repository.contarCandidaturasBloqueantes(candidatoId);
    if (candidaturasBloqueantes > 0) {
      throw new AppError(
        'Nao e permitido excluir candidato com candidatura em_analise ou aprovado.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }

    await this.repository.removerRelacionamentosDoCandidato(candidatoId);
    await this.repository.deletarCandidato(candidatoId);

    return {
      id: candidatoId,
      deletado: true,
    };
  }

}

export default CandidatoService;

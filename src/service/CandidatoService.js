import CandidatoRepository from '../repository/CandidatoRepository.js';
import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import FormacaoRepository from '../repository/FormacaoRepository.js';
import ExperienciaRepository from '../repository/ExperienciaRepository.js';
import HabilidadeRepository from '../repository/HabilidadeRepository.js';
import CertificacaoRepository from '../repository/CertificacaoRepository.js';
import AppError from '../utils/helpers/AppError.js';
import { hashPassword } from '../utils/password.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';

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
    return sanitizeDoc(doc, ['senha']);
  }

  async withHashedPassword(payload) {
    if (!Object.hasOwn(payload, 'senha')) {
      return payload;
    }

    return {
      ...payload,
      senha: await hashPassword(payload.senha),
    };
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
    const candidato = await this.repository.buscarCandidatoPorIdOuUsuarioId(candidatoId);
    if (!candidato) {
      throw new AppError('Candidato nao encontrado.', 404, 'NOT_FOUND');
    }
    return candidato;
  }

  async resolverCandidatoId(candidatoId) {
    const candidato = await this.garantirCandidatoExiste(candidatoId);
    return candidato.id;
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
    const candidatoIdResolvido = candidato.id;

    const [formacao, experiencia, habilidade, certificacao] =
      await Promise.all([
        this.formacaoRepository.listarPorCandidatoId(candidatoIdResolvido),
        this.experienciaRepository.listarPorCandidatoId(candidatoIdResolvido),
        this.habilidadeRepository.listarPorCandidatoId(candidatoIdResolvido),
        this.certificacaoRepository.listarPorCandidatoId(candidatoIdResolvido),
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
    if (formacao) {
      return this.buscarPorId(formacao.candidatoId);
    }

    return this.buscarPorId(formacaoId);
  }

  async buscarPorExperienciaId(experienciaId) {
    const experiencia = await this.experienciaRepository.buscarPorId(experienciaId);
    if (experiencia) {
      return this.buscarPorId(experiencia.candidatoId);
    }

    return this.buscarPorId(experienciaId);
  }

  async buscarPorHabilidadeId(habilidadeId) {
    const habilidade = await this.habilidadeRepository.buscarPorId(habilidadeId);
    if (habilidade) {
      return this.buscarPorId(habilidade.candidatoId);
    }

    return this.buscarPorId(habilidadeId);
  }

  async buscarPorCertificacaoId(certificacaoId) {
    const certificacao = await this.certificacaoRepository.buscarPorId(certificacaoId);
    if (certificacao) {
      return this.buscarPorId(certificacao.candidatoId);
    }

    return this.buscarPorId(certificacaoId);
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

    const payloadComHash = await this.withHashedPassword(payload);
    const created = await this.repository.criarCandidato(payloadComHash);
    return this.sanitize(created.toObject());
  }

  async atualizar(candidatoId, payload) {
    const existente = await this.garantirCandidatoExiste(candidatoId);
    const candidatoIdResolvido = existente.id;

    if (payload.email && payload.email !== existente.email) {
      const emailEmUso = await this.repository.buscarCandidatoPorEmail(payload.email);
      if (emailEmUso && emailEmUso.id !== candidatoIdResolvido) {
        throw new AppError('Ja existe candidato com este email.', 409, 'CONFLICT');
      }
    }

    const payloadComHash = await this.withHashedPassword(payload);
    const updated = await this.repository.atualizarCandidato(candidatoIdResolvido, payloadComHash);
    return this.sanitize(updated);
  }

  async deletar(candidatoId) {
    const candidatoIdResolvido = await this.resolverCandidatoId(candidatoId);

    const candidaturasBloqueantes = await this.repository.contarCandidaturasBloqueantes(candidatoIdResolvido);
    if (candidaturasBloqueantes > 0) {
      throw new AppError(
        'Nao e permitido excluir candidato com candidatura em_analise ou aprovado.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }

    await this.repository.removerRelacionamentosDoCandidato(candidatoIdResolvido);
    await this.repository.deletarCandidato(candidatoIdResolvido);

    return {
      id: candidatoIdResolvido,
      deletado: true,
    };
  }

}

export default CandidatoService;

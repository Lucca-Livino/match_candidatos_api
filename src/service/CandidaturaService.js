import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import AvaliacaoCandidaturaService from './AvaliacaoCandidaturaService.js';
import Usuario from '../models/Usuario.js';
import Vaga from '../models/Vaga.js';
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

  // Remove TODO o rastro da triagem. O recrutador recebe o resultado como
  // fila (candidatura compativel ja chega em 'em_analise'), nunca como
  // rotulo: score, veredito e justificativa da IA sao dados de calibracao e
  // so o papel suporte os enxerga, em /avaliacoes.
  //
  // Esconder isso apenas no front nao contaria: o campo continuaria viajando
  // na resposta, visivel para qualquer um que abrisse o devtools.
  omitirTriagem(candidatura) {
    if (!candidatura) return candidatura;
    const {
      scoreIA,
      limiteAplicado,
      compativel,
      motivoIncompat_,
      justificativa,
      versaoModelo,
      avaliadoEm,
      ...visivel
    } = candidatura;
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
    return list.map((item) => this.omitirTriagem(this.sanitize(item)));
  }

  // Listagem do recrutador: quem se candidatou a esta vaga, em ordem de
  // inscricao. Sem nenhum campo da triagem — o sinal da IA chega ao
  // recrutador pela fila (status), nao por rotulo na tela.
  async listarPorVaga(vagaId) {
    const list = await this.candidaturaRepository.listarPorVagaId(vagaId);
    return list.map((item) => this.omitirTriagem(this.sanitize(item)));
  }

  // Visao do SUPORTE, unica saida da API que expoe scoreIA e limiteAplicado.
  // Existe para calibrar o modelo: sem o numero nao da para saber quantas
  // candidaturas ficaram raspando no limiar. Nao passa por `omitirTriagem` de
  // proposito — a politica de acesso restringe a rota ao papel suporte, e o
  // recrutador continua sem nenhum caminho para o score.
  async listarParaAuditoria(filtros = {}) {
    const lista = await this.candidaturaRepository.listarParaAuditoria(filtros);

    const usuarioIds = [...new Set(lista.map((c) => c.usuarioId))];
    const vagaIds = [...new Set(lista.map((c) => c.vagaId))];

    const [usuarios, vagas] = await Promise.all([
      Usuario.find({ _id: { $in: usuarioIds } }, 'nome email').lean().catch(() => []),
      Vaga.find({ _id: { $in: vagaIds } }, 'titulo').lean().catch(() => []),
    ]);

    const nomePorUsuario = new Map(usuarios.map((u) => [String(u._id), u]));
    const vagaPorId = new Map(vagas.map((v) => [String(v._id), v]));

    return lista.map((candidatura) => {
      const usuario = nomePorUsuario.get(String(candidatura.usuarioId));
      const vaga = vagaPorId.get(String(candidatura.vagaId));

      return {
        ...this.sanitize(candidatura),
        candidato: usuario ? { nome: usuario.nome, email: usuario.email } : null,
        vaga: vaga ? { titulo: vaga.titulo } : null,
      };
    });
  }

  async detalharCandidatura(usuarioId, vagaId) {
    const candidatura = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, vagaId);
    if (!candidatura) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    return this.omitirTriagem(this.sanitize(candidatura));
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
    return this.omitirTriagem(this.sanitize(updated));
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

    return this.omitirTriagem(this.sanitize(atualizada));
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

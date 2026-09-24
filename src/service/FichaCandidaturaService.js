import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import AvaliacaoPayloadService from './AvaliacaoPayloadService.js';
import Usuario from '../models/Usuario.js';
import Vaga from '../models/Vaga.js';
import Habilidade from '../models/Habilidade.js';
import Formacao from '../models/Formacao.js';
import Experiencia from '../models/Experiencia.js';
import Certificacao from '../models/Certificacao.js';
import AppError from '../utils/helpers/AppError.js';

// Ficha de impressao de UMA candidatura: contato, curriculo e respostas.
// Recrutador, admin e suporte abrem a mesma ficha, entao ela e montada campo
// a campo — nada da triagem entra (score, veredito, justificativa, gabarito).
// Espalhar o documento e filtrar depois deixaria um campo novo da triagem
// vazar para o recrutador sem ninguem perceber.
class FichaCandidaturaService {
  constructor(
    candidaturaRepository = new CandidaturaRepository(),
    avaliacaoPayloadService = new AvaliacaoPayloadService(),
  ) {
    this.candidaturaRepository = candidaturaRepository;
    this.avaliacaoPayloadService = avaliacaoPayloadService;
  }

  async montar(usuarioId, vagaId) {
    // A candidatura e a chave de acesso: sem ela a rota viraria consulta
    // livre de curriculo de qualquer usuario.
    const candidatura = await this.candidaturaRepository.buscarPorUsuarioEVaga(usuarioId, vagaId);
    if (!candidatura) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    const [usuario, vaga, curriculo, questionario] = await Promise.all([
      Usuario.findById(usuarioId, 'nome email telefone linkedin cidade').lean().catch(() => null),
      Vaga.findById(vagaId, 'titulo area').lean().catch(() => null),
      this.montarCurriculo(usuarioId),
      this.avaliacaoPayloadService.montarQuestionario(usuarioId, vagaId),
    ]);

    if (!usuario || !vaga) {
      throw new AppError('Candidatura nao encontrada.', 404, 'NOT_FOUND');
    }

    return {
      candidato: {
        id: String(usuario._id),
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone ?? '',
        linkedin: usuario.linkedin ?? '',
        cidade: usuario.cidade ?? '',
      },
      vaga: { id: String(vaga._id), titulo: vaga.titulo, area: vaga.area },
      candidatura: {
        status: candidatura.status,
        criadoEm: candidatura.criadoEm ?? null,
      },
      curriculo,
      questionario: {
        titulo: questionario.titulo,
        respostas: questionario.respostas.map((r) => ({
          perguntaId: r.perguntaId,
          enunciado: r.enunciado,
          tipoResposta: r.tipoResposta,
          textoResposta: r.textoResposta,
          opcoesSelecionadas: r.opcoesSelecionadas,
        })),
      },
    };
  }

  // Parecido com AvaliacaoPayloadService.montarCurriculo de proposito: aquele
  // alimenta a IA, este a impressao (com datas, ids e ordenacao). Unificar os
  // dois acoplaria o que o modelo recebe ao layout da ficha.
  async montarCurriculo(usuarioId) {
    const [habilidades, formacoes, experiencias, certificacoes] = await Promise.all([
      Habilidade.find({ usuarioId }).lean(),
      Formacao.find({ usuarioId }).sort({ anoInicio: -1 }).lean(),
      Experiencia.find({ usuarioId }).sort({ dataInicio: -1 }).lean(),
      Certificacao.find({ usuarioId }).sort({ dataEmissao: -1 }).lean(),
    ]);

    return {
      habilidades: habilidades.map((h) => ({ id: h.id, habilidade: h.habilidade, nivel: h.nivel })),
      formacoes: formacoes.map((f) => ({
        id: f.id,
        instituicao: f.instituicao,
        curso: f.curso,
        grau: f.grau,
        situacao: f.situacao,
        anoInicio: f.anoInicio,
        anoConclusao: f.anoConclusao ?? null,
      })),
      experiencias: experiencias.map((e) => ({
        id: e.id,
        empresa: e.empresa,
        cargo: e.cargo,
        descricaoAtivida_: e.descricaoAtivida_,
        dataInicio: e.dataInicio,
        dataFim: e.dataFim ?? null,
      })),
      certificacoes: certificacoes.map((c) => ({
        id: c.id,
        nome: c.nome,
        emissor: c.emissor,
        dataEmissao: c.dataEmissao ?? null,
        dataExpiracao: c.dataExpiracao ?? null,
        codigo: c.codigo ?? '',
      })),
    };
  }
}

export default FichaCandidaturaService;

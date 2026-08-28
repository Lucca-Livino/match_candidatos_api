import Vaga from '../models/Vaga.js';
import Habilidade from '../models/Habilidade.js';
import Formacao from '../models/Formacao.js';
import Experiencia from '../models/Experiencia.js';
import Certificacao from '../models/Certificacao.js';
import Questionario from '../models/Questionario.js';
import Pergunta from '../models/Pergunta.js';
import OpcaoResposta from '../models/OpcaoResposta.js';
import RespostaQuestionario from '../models/RespostaQuestionario.js';
import RespostaPergunta from '../models/RespostaPergunta.js';
import RespostaOpcaoSelecionada from '../models/RespostaOpcaoSelecionada.js';
import AppError from '../utils/helpers/AppError.js';

class AvaliacaoPayloadService {
  async montarVaga(vagaId) {
    const vaga = await Vaga.findById(vagaId)
      .lean()
      .catch(() => null);
    if (!vaga) {
      throw new AppError('Vaga nao encontrada.', 404, 'NOT_FOUND');
    }

    return {
      titulo: vaga.titulo,
      area: vaga.area,
      descricao: vaga.descricao,
      requisitos_gerais: vaga.requisitos_gerais,
      criterios: (vaga.criterio_vaga || []).map((c) => ({
        id: String(c._id),
        nome: c.nome,
        tipo_criterio: c.tipo_criterio,
        peso_percentual: c.peso_percentual,
        obrigatorio: Boolean(c.obrigatorio),
        descricao: c.descricao || '',
      })),
    };
  }

  async montarCurriculo(usuarioId) {
    const [habilidades, formacoes, experiencias, certificacoes] = await Promise.all([
      Habilidade.find({ usuarioId }).lean(),
      Formacao.find({ usuarioId }).lean(),
      Experiencia.find({ usuarioId }).lean(),
      Certificacao.find({ usuarioId }).lean(),
    ]);

    return {
      habilidades: habilidades.map((h) => ({ habilidade: h.habilidade, nivel: h.nivel })),
      formacoes: formacoes.map((f) => ({
        curso: f.curso,
        grau: f.grau,
        instituicao: f.instituicao,
        situacao: f.situacao,
        anoConclusao: f.anoConclusao,
      })),
      experiencias: experiencias.map((e) => ({
        cargo: e.cargo,
        empresa: e.empresa,
        descricaoAtivida_: e.descricaoAtivida_,
        mesesDuracao: e.mesesDuracao,
      })),
      certificacoes: certificacoes.map((c) => ({ nome: c.nome, emissor: c.emissor })),
    };
  }

  async montarQuestionario(usuarioId, vagaId) {
    const questionario = await Questionario.findOne({ vagaId, ativo: 1 }).lean();
    if (!questionario) return { titulo: null, respostas: [] };

    const respostaQuestionario = await RespostaQuestionario.findOne({
      questionarioId: questionario.id,
      usuarioId,
      status: 'finalizado',
    }).lean();
    if (!respostaQuestionario) return { titulo: questionario.titulo, respostas: [] };

    const perguntas = await Pergunta.find({ questionarioId: questionario.id })
      .sort({ ordem: 1 })
      .lean();
    const respostasPergunta = await RespostaPergunta.find({
      respostaQuestionId: respostaQuestionario.id,
    }).lean();

    const opcoes = await OpcaoResposta.find({
      perguntaId: { $in: perguntas.map((p) => p.id) },
    }).lean();
    const selecionadas = await RespostaOpcaoSelecionada.find({
      respostaPergunta_: { $in: respostasPergunta.map((r) => r.id) },
    }).lean();

    const textoPorOpcaoId = new Map(opcoes.map((o) => [o.id, o.texto]));
    const respostaPorPerguntaId = new Map(respostasPergunta.map((r) => [r.perguntaId, r]));

    const opcoesPorRespostaPerguntaId = selecionadas.reduce((acc, item) => {
      const lista = acc.get(item.respostaPergunta_) || [];
      lista.push(textoPorOpcaoId.get(item.opcaoRespostaId));
      acc.set(item.respostaPergunta_, lista);
      return acc;
    }, new Map());

    const respostas = perguntas
      .map((pergunta) => {
        const resposta = respostaPorPerguntaId.get(pergunta.id);
        if (!resposta) return null;

        return {
          perguntaId: pergunta.id,
          enunciado: pergunta.enunciado,
          tipoResposta: pergunta.tipoResposta,
          textoResposta: resposta.textoResposta || '',
          opcoesSelecionadas: (opcoesPorRespostaPerguntaId.get(resposta.id) || []).filter(Boolean),
        };
      })
      .filter(Boolean);

    return { titulo: questionario.titulo, respostas };
  }

  async montar(usuarioId, vagaId) {
    const [vaga, curriculo, questionario] = await Promise.all([
      this.montarVaga(vagaId),
      this.montarCurriculo(usuarioId),
      this.montarQuestionario(usuarioId, vagaId),
    ]);

    return { vaga, curriculo, questionario };
  }
}

export default AvaliacaoPayloadService;

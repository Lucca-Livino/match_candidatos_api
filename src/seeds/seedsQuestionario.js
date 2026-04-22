import 'dotenv/config';
import DbConnect from '../config/dbconnect.js';
import Vaga from '../models/Vaga.js';
import Candidato from '../models/Candidato.js';
import CandidatoVaga from '../models/CandidatoVaga.js';
import Questionario from '../models/Questionario.js';
import Pergunta from '../models/Pergunta.js';
import OpcaoResposta from '../models/OpcaoResposta.js';
import RespostaQuestionario from '../models/RespostaQuestionario.js';
import RespostaPergunta from '../models/RespostaPergunta.js';
import RespostaOpcaoSelecionada from '../models/RespostaOpcaoSelecionada.js';

const VAGA_TITULO = 'Vaga Backend Questionario';
const CANDIDATO_EMAIL = 'questionario@candidato.com';
const QUESTIONARIO_TITULO = 'Questionario Avaliativo Backend';

async function garantirVaga() {
  return Vaga.findOneAndUpdate(
    { titulo: VAGA_TITULO },
    {
      $set: {
        area: 'TI',
        titulo: VAGA_TITULO,
        descricao: 'Vaga utilizada para questionario, perguntas e respostas.',
        requisitos_gerais: 'Conhecimentos em Node.js, APIs REST e MongoDB.',
        status: 'ativa',
        criterio_vaga: [
          {
            nome: 'Node.js',
            tipo_criterio: 'skill_tecnica',
            peso_percentual: 40,
            obrigatorio: true,
            descricao: 'Experiencia com API REST e servicos Node.js.',
          },
          {
            nome: 'MongoDB',
            tipo_criterio: 'skill_tecnica',
            peso_percentual: 30,
            obrigatorio: true,
            descricao: 'Modelagem e consultas em banco NoSQL.',
          },
          {
            nome: 'Experiencia profissional',
            tipo_criterio: 'experiencia',
            peso_percentual: 30,
            obrigatorio: false,
            descricao: 'Experiencia previa em produtos web.',
          },
        ],
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
}

async function garantirCandidato() {
  return Candidato.findOneAndUpdate(
    { email: CANDIDATO_EMAIL },
    {
      $set: {
        nome: 'Candidato Questionario',
        email: CANDIDATO_EMAIL,
        telefone: '(11) 90000-0000',
        linkedin: 'https://www.linkedin.com/in/questionario-candidato',
        cidade: 'Sao Paulo',
        estado: 'SP',
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
}

async function limparDadosRelacionados(questionarioId) {
  const respostasQuestionario = await RespostaQuestionario.find({ questionarioId }).lean();
  const respostaQuestionarioIds = respostasQuestionario.map((item) => item.id);

  const respostasPergunta = respostaQuestionarioIds.length
    ? await RespostaPergunta.find({ respostaQuestionId: { $in: respostaQuestionarioIds } }).lean()
    : [];

  const respostaPerguntaIds = respostasPergunta.map((item) => item.id);

  if (respostaPerguntaIds.length) {
    await RespostaOpcaoSelecionada.deleteMany({ respostaPergunta_: { $in: respostaPerguntaIds } });
  }

  await Promise.all([
    RespostaPergunta.deleteMany({ respostaQuestionId: { $in: respostaQuestionarioIds } }),
    RespostaQuestionario.deleteMany({ questionarioId }),
  ]);

  const perguntas = await Pergunta.find({ questionarioId }).lean();
  const perguntaIds = perguntas.map((item) => item.id);

  await Promise.all([
    OpcaoResposta.deleteMany({ perguntaId: { $in: perguntaIds } }),
    Pergunta.deleteMany({ questionarioId }),
  ]);
}

async function seedQuestionario() {
  try {
    await DbConnect.conectar();

    const vaga = await garantirVaga();
    const candidato = await garantirCandidato();

    const candidatura = await CandidatoVaga.findOneAndUpdate(
      { candidatoId: candidato.id, vagaId: String(vaga._id) },
      {
        $set: {
          compativel: 1,
          motivoIncompat_: '',
          status: 'em_analise',
          movidoPor: 'sistema',
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );

    const questionario = await Questionario.findOneAndUpdate(
      { titulo: QUESTIONARIO_TITULO, vagaId: String(vaga._id) },
      {
        $set: {
          criadoPor: 'rh@match.com',
          instrucoes: 'Responda todas as perguntas. Objetivas serao avaliadas automaticamente.',
          ativo: 1,
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true },
    );

    await limparDadosRelacionados(questionario.id);

    const [perguntaNode, perguntaDissertativa, perguntaVf] = await Pergunta.insertMany([
      {
        questionarioId: questionario.id,
        enunciado: 'Qual stack backend voce domina mais?',
        tipoResposta: 'multipla_escolha',
        peso: 2,
        obrigatoria: 1,
        ordem: 1,
      },
      {
        questionarioId: questionario.id,
        enunciado: 'Descreva um projeto relevante que voce desenvolveu.',
        tipoResposta: 'dissertativa',
        peso: 3,
        obrigatoria: 1,
        ordem: 2,
      },
      {
        questionarioId: questionario.id,
        enunciado: 'Voce tem experiencia com testes automatizados?',
        tipoResposta: 'verdadeiro_falso',
        peso: 1,
        obrigatoria: 1,
        ordem: 3,
      },
    ]);

    const [opNodeCorreta, opNodeErrada] = await OpcaoResposta.insertMany([
      {
        perguntaId: perguntaNode.id,
        texto: 'Node.js com Express',
        correta: 1,
        ordem: 1,
      },
      {
        perguntaId: perguntaNode.id,
        texto: 'Sem experiencia com backend',
        correta: 0,
        ordem: 2,
      },
    ]);

    const [opVfCorreta, opVfErrada] = await OpcaoResposta.insertMany([
      {
        perguntaId: perguntaVf.id,
        texto: 'Verdadeiro',
        correta: 1,
        ordem: 1,
      },
      {
        perguntaId: perguntaVf.id,
        texto: 'Falso',
        correta: 0,
        ordem: 2,
      },
    ]);

    const respostaQuestionario = await RespostaQuestionario.create({
      questionarioId: questionario.id,
      candidatoId: candidato.id,
      iniciadoEm: new Date('2026-01-20T10:00:00.000Z'),
      criadoEm: new Date('2026-01-20T10:00:00.000Z'),
      finalizadoEm: new Date('2026-01-20T10:12:00.000Z'),
      status: 'finalizado',
    });

    const [respostaNode, respostaDissertativa, respostaVf] = await RespostaPergunta.insertMany([
      {
        respostaQuestionId: respostaQuestionario.id,
        perguntaId: perguntaNode.id,
        textoResposta: '',
      },
      {
        respostaQuestionId: respostaQuestionario.id,
        perguntaId: perguntaDissertativa.id,
        textoResposta:
          'Atuei na construcao de uma API de recrutamento com Node.js, MongoDB e testes de integracao.',
      },
      {
        respostaQuestionId: respostaQuestionario.id,
        perguntaId: perguntaVf.id,
        textoResposta: '',
      },
    ]);

    await RespostaOpcaoSelecionada.insertMany([
      {
        respostaPergunta_: respostaNode.id,
        opcaoRespostaId: opNodeCorreta.id,
      },
      {
        respostaPergunta_: respostaVf.id,
        opcaoRespostaId: opVfErrada.id,
      },
    ]);

    console.log('✓ Carga de questionario/perguntas/respostas finalizada com sucesso.');
    console.log(`  - Vaga: ${String(vaga._id)}`);
    console.log(`  - Candidato: ${candidato.id}`);
    console.log(`  - Questionario: ${questionario.id}`);
    console.log(`  - RespostaQuestionario: ${respostaQuestionario.id}`);

    // Referencias mantidas para evitar lint de variaveis nao usadas em inserts de opcoes.
    void opNodeErrada;
    void opVfCorreta;
    void candidatura;
    void respostaDissertativa;
  } catch (error) {
    console.error('✗ Erro ao executar carga de questionario:', error);
    throw error;
  } finally {
    await DbConnect.desconectar();
  }
}

export default seedQuestionario;

import 'dotenv/config';
import DbConnect from '../config/dbconnect.js';
import Vaga from '../models/Vaga.js';
import Questionario from '../models/Questionario.js';
import Pergunta from '../models/Pergunta.js';
import OpcaoResposta from '../models/OpcaoResposta.js';

const VAGA_TITULO_PADRAO = 'Desenvolvedor Full Stack Node.js/React';
const QUESTIONARIO_TITULO = 'Questionario Avaliativo Backend';

function selecionarVaga(vagas) {
  if (Array.isArray(vagas) && vagas.length) {
    return vagas.find((vaga) => vaga.titulo === VAGA_TITULO_PADRAO) || vagas[0];
  }

  return Vaga.findOne({ titulo: VAGA_TITULO_PADRAO }).lean();
}

async function limparPerguntas(questionarioId) {
  const perguntas = await Pergunta.find({ questionarioId }).lean();
  const perguntaIds = perguntas.map((item) => item.id);

  if (perguntaIds.length) {
    await OpcaoResposta.deleteMany({ perguntaId: { $in: perguntaIds } });
  }

  await Pergunta.deleteMany({ questionarioId });
}

async function seedQuestionario({ vagas = [], useOwnConnection = true } = {}) {
  try {
    if (useOwnConnection) {
      await DbConnect.conectar();
    }

    const vaga = await selecionarVaga(vagas);
    if (!vaga) {
      throw new Error('Nenhuma vaga encontrada para vincular ao questionario.');
    }

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

    await limparPerguntas(questionario.id);

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

    await OpcaoResposta.insertMany([
      { perguntaId: perguntaNode.id, texto: 'Node.js com Express', correta: 1, ordem: 1 },
      { perguntaId: perguntaNode.id, texto: 'Sem experiencia com backend', correta: 0, ordem: 2 },
      { perguntaId: perguntaVf.id, texto: 'Verdadeiro', correta: 1, ordem: 1 },
      { perguntaId: perguntaVf.id, texto: 'Falso', correta: 0, ordem: 2 },
    ]);

    console.log('✓ Carga de questionario e perguntas finalizada com sucesso.');
    console.log(`  - Vaga: ${String(vaga._id)}`);
    console.log(`  - Questionario: ${questionario.id}`);

    void perguntaDissertativa;
  } catch (error) {
    console.error('✗ Erro ao executar carga de questionario:', error);
    throw error;
  } finally {
    if (useOwnConnection) {
      await DbConnect.desconectar();
    }
  }
}

export default seedQuestionario;
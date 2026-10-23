import QuestionarioRepository from '../repository/QuestionarioRepository.js';
import PerguntaRepository from '../repository/PerguntaRepository.js';
import RespostaQuestionarioRepository from '../repository/RespostaQuestionarioRepository.js';
import CandidaturaRepository from '../repository/CandidaturaRepository.js';
import AvaliacaoCandidaturaService from './AvaliacaoCandidaturaService.js';
import AppError from '../utils/helpers/AppError.js';
import { sanitizeDoc } from '../utils/helpers/sanitize.js';

class RespostaQuestionarioService {
  constructor(
    repository = new RespostaQuestionarioRepository(),
    questionarioRepository = new QuestionarioRepository(),
    perguntaRepository = new PerguntaRepository(),
    candidaturaRepository = new CandidaturaRepository(),
    avaliacaoCandidaturaService = new AvaliacaoCandidaturaService(),
  ) {
    this.repository = repository;
    this.questionarioRepository = questionarioRepository;
    this.perguntaRepository = perguntaRepository;
    this.candidaturaRepository = candidaturaRepository;
    this.avaliacaoCandidaturaService = avaliacaoCandidaturaService;
    this.avaliacaoEmAndamento = null;
  }

  sanitize(doc) {
    return sanitizeDoc(doc);
  }

  async garantirQuestionarioExiste(questionarioId) {
    const questionario = await this.questionarioRepository.buscarPorId(questionarioId);

    if (!questionario) {
      throw new AppError('Questionário não encontrado.', 404, 'NOT_FOUND');
    }

    return questionario;
  }

  async garantirRespostaQuestionarioExiste(respostaQuestionarioId) {
    const respostaQuestionario = await this.repository.buscarRespostaQuestionarioPorId(respostaQuestionarioId);

    if (!respostaQuestionario) {
      throw new AppError('Resposta de questionário não encontrada.', 404, 'NOT_FOUND');
    }

    return respostaQuestionario;
  }

  // O RBAC libera estas rotas por papel (administrador e candidato), sem olhar
  // de quem e a resposta. O candidato so age sobre a propria; o administrador
  // segue com acesso a qualquer uma. Sem solicitante (chamada interna, fora do
  // HTTP) nao ha o que conferir.
  garantirDono(usuarioIdDono, solicitante) {
    if (!solicitante) return;
    if (solicitante.tipos_permissao?.includes('administrador')) return;

    if (String(usuarioIdDono) !== String(solicitante.id)) {
      throw new AppError('Acesso negado. Você não tem permissão para realizar esta ação.', 403, 'FORBIDDEN');
    }
  }

  async iniciar(payload, solicitante) {
    this.garantirDono(payload.usuarioId, solicitante);

    const questionario = await this.garantirQuestionarioExiste(payload.questionarioId);

    if (questionario.ativo !== 1) {
      throw new AppError('Não é permitido iniciar questionário inativo.', 400, 'BUSINESS_RULE_ERROR');
    }

    // A avaliacao por IA atualiza a candidatura ao finalizar o questionario.
    // Sem candidatura nao ha o que avaliar nem o que atualizar.
    const candidatura = await this.candidaturaRepository.buscarPorUsuarioEVaga(
      payload.usuarioId,
      questionario.vagaId,
    );
    if (!candidatura) {
      throw new AppError(
        'É necessário se candidatar à vaga antes de responder ao questionário.',
        400,
        'BUSINESS_RULE_ERROR',
      );
    }

    // Idempotente: retomar um envio interrompido devolve a resposta em andamento
    // em vez de bloquear o candidato, que nao tem como recuperar o id sozinho.
    const emAndamento = await this.repository.buscarRespostaEmAndamento(questionario.id, payload.usuarioId);
    if (emAndamento) {
      return this.sanitize(emAndamento);
    }

    const created = await this.repository.criarRespostaQuestionario({
      questionarioId: questionario.id,
      usuarioId: payload.usuarioId,
      status: 'em_andamento',
      iniciadoEm: new Date(),
      criadoEm: new Date(),
      finalizadoEm: null,
    });

    return this.sanitize(created);
  }

  async responder(respostaQuestionarioId, payload, solicitante) {
    const respostaQuestionario = await this.garantirRespostaQuestionarioExiste(respostaQuestionarioId);
    this.garantirDono(respostaQuestionario.usuarioId, solicitante);

    if (respostaQuestionario.status !== 'em_andamento') {
      throw new AppError('Este questionário já foi finalizado e não aceita novas respostas.', 400, 'BUSINESS_RULE_ERROR');
    }

    const perguntas = await this.perguntaRepository.listarPorQuestionarioId(respostaQuestionario.questionarioId);
    const perguntaPorId = new Map(perguntas.map((item) => [item.id, item]));

    const respostasCriadasOuAtualizadas = [];

    for (const respostaInput of payload.respostas) {
      const pergunta = perguntaPorId.get(respostaInput.perguntaId);
      if (!pergunta) {
        throw new AppError(`Pergunta ${respostaInput.perguntaId} não pertence ao questionário informado.`, 400, 'VALIDATION_ERROR');
      }

      const opcaoRespostaIds = respostaInput.opcaoRespostaIds || [];
      const textoResposta = respostaInput.textoResposta || '';

      if (pergunta.tipoResposta === 'dissertativa') {
        if (opcaoRespostaIds.length > 0) {
          throw new AppError('Pergunta dissertativa não aceita opção de resposta.', 400, 'VALIDATION_ERROR');
        }

        if (pergunta.obrigatoria === 1 && !textoResposta) {
          throw new AppError(`A pergunta ${pergunta.id} é obrigatória e exige texto de resposta.`, 400, 'VALIDATION_ERROR');
        }
      } else {
        if (opcaoRespostaIds.length > 1) {
          throw new AppError('Esta versão aceita apenas uma opção selecionada por pergunta objetiva.', 400, 'VALIDATION_ERROR');
        }

        if (pergunta.obrigatoria === 1 && opcaoRespostaIds.length === 0) {
          throw new AppError(`A pergunta ${pergunta.id} é obrigatória e exige opção selecionada.`, 400, 'VALIDATION_ERROR');
        }

        if (opcaoRespostaIds.length > 0) {
          const opcoesValidas = await this.perguntaRepository.buscarOpcaoPorIds(opcaoRespostaIds);
          if (opcoesValidas.length !== opcaoRespostaIds.length) {
            throw new AppError('Uma ou mais opções de resposta informadas não existem.', 400, 'VALIDATION_ERROR');
          }

          const opcaoInvalida = opcoesValidas.find((item) => item.perguntaId !== pergunta.id);
          if (opcaoInvalida) {
            throw new AppError('Opção de resposta não pertence à pergunta informada.', 400, 'VALIDATION_ERROR');
          }
        }
      }

      const existente = await this.repository.buscarRespostaPergunta(respostaQuestionario.id, pergunta.id);

      const respostaPergunta = existente
        ? await this.repository.atualizarRespostaPergunta(existente.id, { textoResposta })
        : await this.repository.criarRespostaPergunta({
            respostaQuestionId: respostaQuestionario.id,
            perguntaId: pergunta.id,
            textoResposta,
            criadoEm: new Date(),
          });

      await this.repository.deletarOpcoesSelecionadasPorRespostaPerguntaId(respostaPergunta.id);

      if (opcaoRespostaIds.length > 0) {
        await this.repository.criarRespostasOpcaoSelecionada(
          opcaoRespostaIds.map((opcaoRespostaId) => ({
            respostaPergunta_: respostaPergunta.id,
            opcaoRespostaId,
          })),
        );
      }

      respostasCriadasOuAtualizadas.push(this.sanitize(respostaPergunta));
    }

    return {
      respostaQuestionarioId: respostaQuestionario.id,
      respostas: respostasCriadasOuAtualizadas,
    };
  }

  async finalizar(respostaQuestionarioId, solicitante) {
    const respostaQuestionario = await this.garantirRespostaQuestionarioExiste(respostaQuestionarioId);
    this.garantirDono(respostaQuestionario.usuarioId, solicitante);

    if (respostaQuestionario.status !== 'em_andamento') {
      throw new AppError('A resposta já foi finalizada.', 400, 'BUSINESS_RULE_ERROR');
    }

    const finalizada = await this.repository.atualizarRespostaQuestionario(respostaQuestionario.id, {
      status: 'finalizado',
      finalizadoEm: new Date(),
    });

    const questionario = await this.garantirQuestionarioExiste(respostaQuestionario.questionarioId);

    // Fire-and-forget: a resposta HTTP nao espera a IA. O `.catch` evita
    // unhandledRejection; a promise fica exposta para quem precisar aguardar.
    this.avaliacaoEmAndamento = Promise.resolve(
      this.avaliacaoCandidaturaService.avaliar(respostaQuestionario.usuarioId, questionario.vagaId),
    ).catch((error) => {
      console.error('[avaliacao] disparo falhou', {
        usuarioId: respostaQuestionario.usuarioId,
        vagaId: questionario.vagaId,
        erro: error.message,
      });
    });

    return this.sanitize(finalizada);
  }

  async buscarCompleta(respostaQuestionarioId, solicitante) {
    const respostaQuestionario = await this.garantirRespostaQuestionarioExiste(respostaQuestionarioId);
    this.garantirDono(respostaQuestionario.usuarioId, solicitante);
    const questionario = await this.garantirQuestionarioExiste(respostaQuestionario.questionarioId);

    const perguntas = await this.perguntaRepository.listarPorQuestionarioId(questionario.id);
    const respostasPergunta = await this.repository.listarRespostasPerguntaPorRespostaQuestionId(respostaQuestionario.id);

    const respostaPerguntaPorPerguntaId = new Map(respostasPergunta.map((item) => [item.perguntaId, item]));
    const respostaPerguntaIds = respostasPergunta.map((item) => item.id);

    const opcoesPergunta = perguntas.length
      ? await this.perguntaRepository.listarOpcoesPorPerguntaIds(perguntas.map((item) => item.id))
      : [];

    const opcoesSelecionadas = respostaPerguntaIds.length
      ? await this.repository.listarRespostasOpcaoSelecionadaPorRespostaPerguntaIds(respostaPerguntaIds)
      : [];

    const opcoesPorPerguntaId = opcoesPergunta.reduce((acc, item) => {
      if (!acc[item.perguntaId]) {
        acc[item.perguntaId] = [];
      }
      acc[item.perguntaId].push(this.sanitize(item));
      return acc;
    }, {});

    const opcoesSelecionadasPorRespostaPerguntaId = opcoesSelecionadas.reduce((acc, item) => {
      if (!acc[item.respostaPergunta_]) {
        acc[item.respostaPergunta_] = [];
      }
      acc[item.respostaPergunta_].push(item.opcaoRespostaId);
      return acc;
    }, {});

    const perguntasComRespostas = perguntas
      .slice()
      .sort((a, b) => a.ordem - b.ordem)
      .map((pergunta) => {
        const perguntaSanitizada = this.sanitize(pergunta);
        const opcoes =
          pergunta.tipoResposta === 'dissertativa'
            ? []
            : (opcoesPorPerguntaId[pergunta.id] || []).sort((a, b) => a.ordem - b.ordem);

        const respostaPergunta = respostaPerguntaPorPerguntaId.get(pergunta.id);

        if (!respostaPergunta) {
          return {
            ...perguntaSanitizada,
            opcaoResposta: opcoes,
            resposta: null,
          };
        }

        return {
          ...perguntaSanitizada,
          opcaoResposta: opcoes,
          resposta: {
            ...this.sanitize(respostaPergunta),
            opcaoRespostaIds: opcoesSelecionadasPorRespostaPerguntaId[respostaPergunta.id] || [],
          },
        };
      });

    return {
      ...this.sanitize(respostaQuestionario),
      questionario: {
        ...this.sanitize(questionario),
        perguntas: perguntasComRespostas,
      },
    };
  }
}

export default RespostaQuestionarioService;

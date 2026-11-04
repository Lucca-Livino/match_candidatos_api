import CandidaturaService from './CandidaturaService.js';
import { SEM_CRITERIOS } from './AvaliacaoCandidaturaService.js';
import Usuario from '../models/Usuario.js';
import Vaga from '../models/Vaga.js';
import AppError from '../utils/helpers/AppError.js';

const VAGA_ID = '507f1f77bcf86cd799439011';
const USUARIO_ID = 'usuario-1';

const consultaQueResolve = (valor) => ({ lean: jest.fn().mockResolvedValue(valor) });
const consultaQueFalha = () => ({ lean: jest.fn().mockRejectedValue(new Error('falha no banco')) });

const candidaturaCompleta = (extra = {}) => ({
  _id: 'cand-1',
  __v: 0,
  usuarioId: USUARIO_ID,
  vagaId: VAGA_ID,
  status: 'inscrito',
  movidoPor: 'sistema',
  scoreIA: 0.82,
  limiteAplicado: 0.7,
  compativel: true,
  motivoIncompat_: '',
  justificativa: 'Atende aos critérios.',
  criteriosAvaliados: [{ criterioId: 'c1', aderencia: 1 }],
  versaoModelo: 'gemini-teste',
  avaliadoEm: new Date('2026-10-01T00:00:00Z'),
  ...extra,
});

const CAMPOS_DA_TRIAGEM = [
  'scoreIA',
  'limiteAplicado',
  'compativel',
  'motivoIncompat_',
  'justificativa',
  'criteriosAvaliados',
  'versaoModelo',
  'avaliadoEm',
];

const criarRepositorio = () => ({
  buscarPorUsuarioEVaga: jest.fn(),
  criar: jest.fn(),
  listarPorUsuarioId: jest.fn(),
  listarPorVagaId: jest.fn(),
  listarParaAuditoria: jest.fn(),
  atualizarPorUsuarioEVaga: jest.fn(),
  deletarPorUsuarioEVaga: jest.fn(),
});

const esperarAppError = async (promessa, { mensagem, statusCode, code }) => {
  const erro = await promessa.catch((e) => e);
  expect(erro).toBeInstanceOf(AppError);
  expect(erro.message).toBe(mensagem);
  expect(erro.statusCode).toBe(statusCode);
  expect(erro.code).toBe(code);
};

describe('CandidaturaService', () => {
  let repositorio;
  let avaliacaoService;
  let questionarioRepository;
  let respostaQuestionarioRepository;
  let service;

  beforeEach(() => {
    repositorio = criarRepositorio();
    avaliacaoService = { avaliar: jest.fn() };
    questionarioRepository = { listarPorVagaIds: jest.fn().mockResolvedValue([]) };
    respostaQuestionarioRepository = { listarFinalizadasDoUsuario: jest.fn().mockResolvedValue([]) };
    service = new CandidaturaService(
      repositorio,
      avaliacaoService,
      questionarioRepository,
      respostaQuestionarioRepository,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('omitirTriagem', () => {
    it('remove todos os campos da triagem por IA', () => {
      const visivel = service.omitirTriagem(candidaturaCompleta());

      for (const campo of CAMPOS_DA_TRIAGEM) {
        expect(visivel).not.toHaveProperty(campo);
      }
      expect(visivel).toMatchObject({ usuarioId: USUARIO_ID, vagaId: VAGA_ID, status: 'inscrito' });
    });

    it('troca movidoPor "ia" por "sistema" para não vazar o veredito', () => {
      expect(service.omitirTriagem(candidaturaCompleta({ movidoPor: 'ia' })).movidoPor).toBe('sistema');
    });

    it('mantém movidoPor "recrutador" como está', () => {
      expect(service.omitirTriagem(candidaturaCompleta({ movidoPor: 'recrutador' })).movidoPor).toBe('recrutador');
    });

    it('devolve null e undefined sem alterar', () => {
      expect(service.omitirTriagem(null)).toBeNull();
      expect(service.omitirTriagem(undefined)).toBeUndefined();
    });

    it('não altera o objeto recebido', () => {
      const original = candidaturaCompleta({ movidoPor: 'ia' });
      service.omitirTriagem(original);

      expect(original.movidoPor).toBe('ia');
      expect(original.scoreIA).toBe(0.82);
    });
  });

  describe('validarTransicaoStatus', () => {
    it.each([
      ['inscrito', 'em_analise'],
      ['em_analise', 'aprovado'],
      ['em_analise', 'reprovado'],
      ['aprovado', 'em_analise'],
      ['reprovado', 'em_analise'],
    ])('permite mover de %s para %s', (atual, novo) => {
      expect(() => service.validarTransicaoStatus(atual, novo)).not.toThrow();
    });

    it.each([
      ['inscrito', 'aprovado', 'Inscrito', 'Aprovado'],
      ['inscrito', 'reprovado', 'Inscrito', 'Reprovado'],
      ['inscrito', 'inscrito', 'Inscrito', 'Inscrito'],
      ['em_analise', 'inscrito', 'Em análise', 'Inscrito'],
      ['em_analise', 'em_analise', 'Em análise', 'Em análise'],
      ['aprovado', 'reprovado', 'Aprovado', 'Reprovado'],
      ['reprovado', 'aprovado', 'Reprovado', 'Aprovado'],
      ['aprovado', 'inscrito', 'Aprovado', 'Inscrito'],
      ['reprovado', 'inscrito', 'Reprovado', 'Inscrito'],
    ])('bloqueia mover de %s para %s com mensagem legível', (atual, novo, rotuloAtual, rotuloNovo) => {
      let erro;
      try {
        service.validarTransicaoStatus(atual, novo);
      } catch (e) {
        erro = e;
      }

      expect(erro).toBeInstanceOf(AppError);
      expect(erro.message).toBe(`Não é possível mover a candidatura de ${rotuloAtual} para ${rotuloNovo}.`);
      expect(erro.statusCode).toBe(400);
      expect(erro.code).toBe('BUSINESS_RULE_ERROR');
    });

    it('usa o próprio valor como rótulo quando o status é desconhecido', () => {
      expect(() => service.validarTransicaoStatus('arquivado', 'em_analise')).toThrow(
        'Não é possível mover a candidatura de arquivado para Em análise.',
      );
    });
  });

  describe('garantirVagaAberta', () => {
    it('aceita vaga ativa, buscando só o status', async () => {
      const findById = jest.spyOn(Vaga, 'findById').mockReturnValue(consultaQueResolve({ status: 'ativa' }));

      await expect(service.garantirVagaAberta(VAGA_ID)).resolves.toBeUndefined();
      expect(findById).toHaveBeenCalledWith(VAGA_ID, 'status');
    });

    it('lança 404 sem consultar o banco quando o id é inválido', async () => {
      const findById = jest.spyOn(Vaga, 'findById');

      await esperarAppError(service.garantirVagaAberta('id-invalido'), {
        mensagem: 'Vaga não encontrada.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(findById).not.toHaveBeenCalled();
    });

    it('lança 404 quando a vaga não existe', async () => {
      jest.spyOn(Vaga, 'findById').mockReturnValue(consultaQueResolve(null));

      await esperarAppError(service.garantirVagaAberta(VAGA_ID), {
        mensagem: 'Vaga não encontrada.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it.each(['pausada', 'encerrada', 'rascunho'])('lança 400 quando a vaga está %s', async (status) => {
      jest.spyOn(Vaga, 'findById').mockReturnValue(consultaQueResolve({ status }));

      await esperarAppError(service.garantirVagaAberta(VAGA_ID), {
        mensagem: 'Esta vaga não está recebendo candidaturas.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
    });
  });

  describe('criarCandidatura', () => {
    it('cria com status inscrito e o usuário autenticado, sem campos da triagem', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(null);
      jest.spyOn(Vaga, 'findById').mockReturnValue(consultaQueResolve({ status: 'ativa' }));
      repositorio.criar.mockResolvedValue({ toObject: () => candidaturaCompleta() });

      const resultado = await service.criarCandidatura(USUARIO_ID, {
        vagaId: VAGA_ID,
        usuarioId: 'outro-usuario',
        status: 'aprovado',
      });

      expect(repositorio.buscarPorUsuarioEVaga).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID);
      expect(repositorio.criar).toHaveBeenCalledWith({ vagaId: VAGA_ID, usuarioId: USUARIO_ID, status: 'inscrito' });
      expect(resultado).not.toHaveProperty('__v');
      expect(resultado).not.toHaveProperty('scoreIA');
      expect(resultado.status).toBe('inscrito');
    });

    it('lança 409 quando o usuário já está inscrito, antes de checar a vaga', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta());
      const findById = jest.spyOn(Vaga, 'findById');

      await esperarAppError(service.criarCandidatura(USUARIO_ID, { vagaId: VAGA_ID }), {
        mensagem: 'Usuário já está inscrito nesta vaga.',
        statusCode: 409,
        code: 'CONFLICT',
      });
      expect(findById).not.toHaveBeenCalled();
      expect(repositorio.criar).not.toHaveBeenCalled();
    });

    it('não cria quando a vaga não está ativa', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(null);
      jest.spyOn(Vaga, 'findById').mockReturnValue(consultaQueResolve({ status: 'pausada' }));

      await esperarAppError(service.criarCandidatura(USUARIO_ID, { vagaId: VAGA_ID }), {
        mensagem: 'Esta vaga não está recebendo candidaturas.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repositorio.criar).not.toHaveBeenCalled();
    });
  });

  describe('listarCandidatura', () => {
    it('lista as candidaturas do usuário sem triagem e sem __v', async () => {
      repositorio.listarPorUsuarioId.mockResolvedValue([
        candidaturaCompleta(),
        candidaturaCompleta({ _id: 'cand-2', movidoPor: 'ia', status: 'em_analise' }),
      ]);

      const lista = await service.listarCandidatura(USUARIO_ID);

      expect(repositorio.listarPorUsuarioId).toHaveBeenCalledWith(USUARIO_ID);
      expect(lista).toHaveLength(2);
      for (const item of lista) {
        expect(item).not.toHaveProperty('__v');
        expect(item).not.toHaveProperty('scoreIA');
        expect(item).not.toHaveProperty('justificativa');
      }
      expect(lista[1].movidoPor).toBe('sistema');
    });

    it('devolve lista vazia quando o usuário não tem candidaturas', async () => {
      repositorio.listarPorUsuarioId.mockResolvedValue([]);

      await expect(service.listarCandidatura(USUARIO_ID)).resolves.toEqual([]);
      expect(questionarioRepository.listarPorVagaIds).not.toHaveBeenCalled();
    });
  });

  describe('questionarioPendente', () => {
    const CRIADA_EM = new Date('2026-11-01T10:00:00Z');
    const OUTRA_VAGA = '507f1f77bcf86cd799439022';

    beforeEach(() => {
      repositorio.listarPorUsuarioId.mockResolvedValue([candidaturaCompleta({ criadoEm: CRIADA_EM })]);
    });

    it('marca pendente quando a vaga tem questionário ativo e nenhuma resposta finalizada', async () => {
      questionarioRepository.listarPorVagaIds.mockResolvedValue([{ id: 'q1', vagaId: VAGA_ID, ativo: 1 }]);

      const [item] = await service.listarCandidatura(USUARIO_ID);

      expect(questionarioRepository.listarPorVagaIds).toHaveBeenCalledWith([VAGA_ID]);
      expect(respostaQuestionarioRepository.listarFinalizadasDoUsuario).toHaveBeenCalledWith(USUARIO_ID, ['q1']);
      expect(item.questionarioPendente).toBe(true);
    });

    it('não marca pendente quando há resposta finalizada depois da candidatura', async () => {
      questionarioRepository.listarPorVagaIds.mockResolvedValue([{ id: 'q1', vagaId: VAGA_ID, ativo: 1 }]);
      respostaQuestionarioRepository.listarFinalizadasDoUsuario.mockResolvedValue([
        { questionarioId: 'q1', finalizadoEm: new Date('2026-11-01T10:05:00Z') },
      ]);

      const [item] = await service.listarCandidatura(USUARIO_ID);

      expect(item.questionarioPendente).toBe(false);
    });

    it('resposta finalizada antes da candidatura (cancelada e refeita) não conta', async () => {
      questionarioRepository.listarPorVagaIds.mockResolvedValue([{ id: 'q1', vagaId: VAGA_ID, ativo: 1 }]);
      respostaQuestionarioRepository.listarFinalizadasDoUsuario.mockResolvedValue([
        { questionarioId: 'q1', finalizadoEm: new Date('2026-10-01T10:00:00Z') },
      ]);

      const [item] = await service.listarCandidatura(USUARIO_ID);

      expect(item.questionarioPendente).toBe(true);
    });

    it('resposta de questionário de outra vaga não conta', async () => {
      questionarioRepository.listarPorVagaIds.mockResolvedValue([
        { id: 'q1', vagaId: VAGA_ID, ativo: 1 },
        { id: 'q2', vagaId: OUTRA_VAGA, ativo: 1 },
      ]);
      respostaQuestionarioRepository.listarFinalizadasDoUsuario.mockResolvedValue([
        { questionarioId: 'q2', finalizadoEm: new Date('2026-11-02T10:00:00Z') },
      ]);

      const [item] = await service.listarCandidatura(USUARIO_ID);

      expect(item.questionarioPendente).toBe(true);
    });

    it('não marca pendente quando a vaga não tem questionário ativo', async () => {
      questionarioRepository.listarPorVagaIds.mockResolvedValue([{ id: 'q1', vagaId: VAGA_ID, ativo: 0 }]);

      const [item] = await service.listarCandidatura(USUARIO_ID);

      expect(item.questionarioPendente).toBe(false);
    });

    it('vaga sem questionário não consulta respostas e não fica pendente', async () => {
      const [item] = await service.listarCandidatura(USUARIO_ID);

      expect(respostaQuestionarioRepository.listarFinalizadasDoUsuario).not.toHaveBeenCalled();
      expect(item.questionarioPendente).toBe(false);
    });

    it('o detalhe da candidatura também traz o indicador', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ criadoEm: CRIADA_EM }));
      questionarioRepository.listarPorVagaIds.mockResolvedValue([{ id: 'q1', vagaId: VAGA_ID, ativo: 1 }]);

      const resultado = await service.detalharCandidatura(USUARIO_ID, VAGA_ID);

      expect(resultado.questionarioPendente).toBe(true);
    });
  });

  describe('listarPorVaga', () => {
    it('anexa o contato do candidato e omite a triagem', async () => {
      repositorio.listarPorVagaId.mockResolvedValue([
        candidaturaCompleta({ usuarioId: 'u1' }),
        candidaturaCompleta({ _id: 'cand-2', usuarioId: 'u2' }),
      ]);
      const find = jest.spyOn(Usuario, 'find').mockReturnValue(
        consultaQueResolve([
          {
            _id: 'u1',
            nome: 'Ana',
            email: 'ana@exemplo.com',
            telefone: '11999999999',
            linkedin: 'linkedin.com/in/ana',
            cidade: 'São Paulo',
          },
          { _id: 'u2', nome: 'Bruno', email: 'bruno@exemplo.com' },
        ]),
      );

      const lista = await service.listarPorVaga(VAGA_ID);

      expect(repositorio.listarPorVagaId).toHaveBeenCalledWith(VAGA_ID);
      expect(find).toHaveBeenCalledWith({ _id: { $in: ['u1', 'u2'] } }, 'nome email telefone linkedin cidade');
      expect(lista[0].candidato).toEqual({
        id: 'u1',
        nome: 'Ana',
        email: 'ana@exemplo.com',
        telefone: '11999999999',
        linkedin: 'linkedin.com/in/ana',
        cidade: 'São Paulo',
      });
      expect(lista[1].candidato).toEqual({
        id: 'u2',
        nome: 'Bruno',
        email: 'bruno@exemplo.com',
        telefone: '',
        linkedin: '',
        cidade: '',
      });
      for (const item of lista) {
        expect(item).not.toHaveProperty('scoreIA');
        expect(item).not.toHaveProperty('__v');
      }
    });

    it('consulta cada usuário uma vez só, mesmo repetido na lista', async () => {
      repositorio.listarPorVagaId.mockResolvedValue([
        candidaturaCompleta({ usuarioId: 'u1' }),
        candidaturaCompleta({ usuarioId: 'u1' }),
      ]);
      const find = jest.spyOn(Usuario, 'find').mockReturnValue(consultaQueResolve([]));

      await service.listarPorVaga(VAGA_ID);

      expect(find).toHaveBeenCalledTimes(1);
      expect(find.mock.calls[0][0]).toEqual({ _id: { $in: ['u1'] } });
    });

    it('deixa candidato null quando o usuário não existe mais', async () => {
      repositorio.listarPorVagaId.mockResolvedValue([candidaturaCompleta({ usuarioId: 'removido' })]);
      jest.spyOn(Usuario, 'find').mockReturnValue(consultaQueResolve([]));

      const [item] = await service.listarPorVaga(VAGA_ID);

      expect(item.candidato).toBeNull();
    });

    it('não quebra a listagem quando a busca de usuários falha', async () => {
      repositorio.listarPorVagaId.mockResolvedValue([candidaturaCompleta({ usuarioId: 'u1' })]);
      jest.spyOn(Usuario, 'find').mockReturnValue(consultaQueFalha());

      const [item] = await service.listarPorVaga(VAGA_ID);

      expect(item.candidato).toBeNull();
      expect(item.status).toBe('inscrito');
    });

    it('casa usuário e candidatura mesmo quando os ids são ObjectId', async () => {
      const idObjeto = { toString: () => 'u1' };
      repositorio.listarPorVagaId.mockResolvedValue([candidaturaCompleta({ usuarioId: idObjeto })]);
      jest.spyOn(Usuario, 'find').mockReturnValue(
        consultaQueResolve([{ _id: { toString: () => 'u1' }, nome: 'Ana', email: 'ana@exemplo.com' }]),
      );

      const [item] = await service.listarPorVaga(VAGA_ID);

      expect(item.candidato).toMatchObject({ id: 'u1', nome: 'Ana' });
    });
  });

  describe('listarParaAuditoria', () => {
    it('mantém score e triagem e anexa nome do candidato e título da vaga', async () => {
      const filtros = { vagaId: VAGA_ID };
      repositorio.listarParaAuditoria.mockResolvedValue([
        candidaturaCompleta({ usuarioId: 'u1', vagaId: 'v1', movidoPor: 'ia' }),
        candidaturaCompleta({ _id: 'cand-2', usuarioId: 'u2', vagaId: 'v1' }),
      ]);
      jest.spyOn(Usuario, 'find').mockReturnValue(
        consultaQueResolve([{ _id: 'u1', nome: 'Ana', email: 'ana@exemplo.com', telefone: '119' }]),
      );
      const findVaga = jest.spyOn(Vaga, 'find').mockReturnValue(
        consultaQueResolve([{ _id: 'v1', titulo: 'Desenvolvedora React' }]),
      );

      const lista = await service.listarParaAuditoria(filtros);

      expect(repositorio.listarParaAuditoria).toHaveBeenCalledWith(filtros);
      expect(findVaga).toHaveBeenCalledWith({ _id: { $in: ['v1'] } }, 'titulo');
      expect(lista[0]).toMatchObject({
        scoreIA: 0.82,
        limiteAplicado: 0.7,
        justificativa: 'Atende aos critérios.',
        movidoPor: 'ia',
        candidato: { nome: 'Ana', email: 'ana@exemplo.com' },
        vaga: { titulo: 'Desenvolvedora React' },
      });
      expect(lista[0].candidato).not.toHaveProperty('telefone');
      expect(lista[0]).not.toHaveProperty('__v');
      expect(lista[1].candidato).toBeNull();
    });

    it('usa filtros vazios por padrão', async () => {
      repositorio.listarParaAuditoria.mockResolvedValue([]);
      jest.spyOn(Usuario, 'find').mockReturnValue(consultaQueResolve([]));
      jest.spyOn(Vaga, 'find').mockReturnValue(consultaQueResolve([]));

      await expect(service.listarParaAuditoria()).resolves.toEqual([]);
      expect(repositorio.listarParaAuditoria).toHaveBeenCalledWith({});
    });

    it('deixa vaga null quando a busca de vagas falha', async () => {
      repositorio.listarParaAuditoria.mockResolvedValue([candidaturaCompleta({ usuarioId: 'u1', vagaId: 'v1' })]);
      jest.spyOn(Usuario, 'find').mockReturnValue(consultaQueResolve([{ _id: 'u1', nome: 'Ana', email: 'a@b.com' }]));
      jest.spyOn(Vaga, 'find').mockReturnValue(consultaQueFalha());

      const [item] = await service.listarParaAuditoria();

      expect(item.vaga).toBeNull();
      expect(item.candidato).toEqual({ nome: 'Ana', email: 'a@b.com' });
    });
  });

  describe('detalharCandidatura', () => {
    it('devolve a candidatura do usuário sem triagem', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ movidoPor: 'ia' }));

      const resultado = await service.detalharCandidatura(USUARIO_ID, VAGA_ID);

      expect(repositorio.buscarPorUsuarioEVaga).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID);
      expect(resultado).not.toHaveProperty('scoreIA');
      expect(resultado).not.toHaveProperty('__v');
      expect(resultado.movidoPor).toBe('sistema');
    });

    it('lança 404 quando a candidatura não existe', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(null);

      await esperarAppError(service.detalharCandidatura(USUARIO_ID, VAGA_ID), {
        mensagem: 'Candidatura não encontrada.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('atualizarStatusCandidatura', () => {
    it('move de inscrito para em análise sem registrar reabertura', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ status: 'inscrito' }));
      repositorio.atualizarPorUsuarioEVaga.mockResolvedValue(
        candidaturaCompleta({ status: 'em_analise', movidoPor: 'recrutador' }),
      );
      const payload = { status: 'em_analise', movidoPor: 'recrutador' };

      const resultado = await service.atualizarStatusCandidatura(USUARIO_ID, VAGA_ID, payload, 'recrutador-1');

      expect(repositorio.atualizarPorUsuarioEVaga).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID, payload);
      expect(resultado.status).toBe('em_analise');
      expect(resultado).not.toHaveProperty('scoreIA');
    });

    it.each(['aprovado', 'reprovado'])('registra quem reabriu e quando ao voltar de %s', async (statusAtual) => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ status: statusAtual }));
      repositorio.atualizarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ status: 'em_analise' }));
      const antes = Date.now();

      await service.atualizarStatusCandidatura(
        USUARIO_ID,
        VAGA_ID,
        { status: 'em_analise', movidoPor: 'recrutador' },
        'recrutador-1',
      );

      const [, , dados] = repositorio.atualizarPorUsuarioEVaga.mock.calls[0];
      expect(dados).toMatchObject({ status: 'em_analise', movidoPor: 'recrutador', reabertoPor: 'recrutador-1' });
      expect(dados.reabertoEm).toBeInstanceOf(Date);
      expect(dados.reabertoEm.getTime()).toBeGreaterThanOrEqual(antes);
    });

    it('usa movidoPor como autor da reabertura quando não há ator', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ status: 'aprovado' }));
      repositorio.atualizarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ status: 'em_analise' }));

      await service.atualizarStatusCandidatura(USUARIO_ID, VAGA_ID, { status: 'em_analise', movidoPor: 'recrutador' });

      expect(repositorio.atualizarPorUsuarioEVaga.mock.calls[0][2].reabertoPor).toBe('recrutador');
    });

    it('lança 404 quando a candidatura não existe', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(null);

      await esperarAppError(service.atualizarStatusCandidatura(USUARIO_ID, VAGA_ID, { status: 'em_analise' }), {
        mensagem: 'Candidatura não encontrada.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(repositorio.atualizarPorUsuarioEVaga).not.toHaveBeenCalled();
    });

    it('não grava nada quando a transição é inválida', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ status: 'aprovado' }));

      await esperarAppError(service.atualizarStatusCandidatura(USUARIO_ID, VAGA_ID, { status: 'reprovado' }), {
        mensagem: 'Não é possível mover a candidatura de Aprovado para Reprovado.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repositorio.atualizarPorUsuarioEVaga).not.toHaveBeenCalled();
    });
  });

  describe('reavaliarCandidatura', () => {
    it('reavalia candidatura inscrita e devolve o resultado sem triagem', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ status: 'inscrito', avaliadoEm: null }));
      avaliacaoService.avaliar.mockResolvedValue(candidaturaCompleta({ status: 'em_analise', movidoPor: 'ia' }));

      const resultado = await service.reavaliarCandidatura(USUARIO_ID, VAGA_ID);

      expect(avaliacaoService.avaliar).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID);
      expect(resultado.status).toBe('em_analise');
      expect(resultado.movidoPor).toBe('sistema');
      for (const campo of CAMPOS_DA_TRIAGEM) {
        expect(resultado).not.toHaveProperty(campo);
      }
    });

    it('lança 404 quando a candidatura não existe', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(null);

      await esperarAppError(service.reavaliarCandidatura(USUARIO_ID, VAGA_ID), {
        mensagem: 'Candidatura não encontrada.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(avaliacaoService.avaliar).not.toHaveBeenCalled();
    });

    it.each([
      ['em_analise', 'Em análise'],
      ['aprovado', 'Aprovado'],
      ['reprovado', 'Reprovado'],
    ])('recusa reavaliar candidatura com status %s', async (status, rotulo) => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ status }));

      await esperarAppError(service.reavaliarCandidatura(USUARIO_ID, VAGA_ID), {
        mensagem: `Candidatura com status ${rotulo} não pode ser reavaliada.`,
        statusCode: 409,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(avaliacaoService.avaliar).not.toHaveBeenCalled();
    });

    it('lança 409 quando a vaga não tem critérios', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta());
      avaliacaoService.avaliar.mockResolvedValue(SEM_CRITERIOS);

      await esperarAppError(service.reavaliarCandidatura(USUARIO_ID, VAGA_ID), {
        mensagem: 'Vaga sem critérios: a triagem automática não se aplica.',
        statusCode: 409,
        code: 'BUSINESS_RULE_ERROR',
      });
    });

    it('lança 503 quando a IA está desligada ou falhou', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta());
      avaliacaoService.avaliar.mockResolvedValue(null);

      await esperarAppError(service.reavaliarCandidatura(USUARIO_ID, VAGA_ID), {
        mensagem: 'Avaliação por IA indisponível.',
        statusCode: 503,
        code: 'AI_UNAVAILABLE',
      });
    });
  });

  describe('cancelarCandidatura', () => {
    it.each(['inscrito', 'em_analise'])('cancela candidatura com status %s', async (status) => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ status }));

      const resultado = await service.cancelarCandidatura(USUARIO_ID, VAGA_ID);

      expect(repositorio.deletarPorUsuarioEVaga).toHaveBeenCalledWith(USUARIO_ID, VAGA_ID);
      expect(resultado).toEqual({ vagaId: VAGA_ID, cancelada: true });
    });

    it('lança 404 quando a candidatura não existe', async () => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(null);

      await esperarAppError(service.cancelarCandidatura(USUARIO_ID, VAGA_ID), {
        mensagem: 'Candidatura não encontrada.',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
      expect(repositorio.deletarPorUsuarioEVaga).not.toHaveBeenCalled();
    });

    it.each(['aprovado', 'reprovado'])('recusa cancelar candidatura já decidida (%s)', async (status) => {
      repositorio.buscarPorUsuarioEVaga.mockResolvedValue(candidaturaCompleta({ status }));

      await esperarAppError(service.cancelarCandidatura(USUARIO_ID, VAGA_ID), {
        mensagem: 'Só é possível cancelar candidaturas com status Inscrito ou Em análise.',
        statusCode: 400,
        code: 'BUSINESS_RULE_ERROR',
      });
      expect(repositorio.deletarPorUsuarioEVaga).not.toHaveBeenCalled();
    });
  });
});

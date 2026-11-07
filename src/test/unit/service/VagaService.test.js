import VagaService from '../../../service/VagaService.js';
import AppError from '../../../utils/helpers/AppError.js';

const ID = '64b7f0c2a1b2c3d4e5f60718';
const OUTRO_ID = '64b7f0c2a1b2c3d4e5f60719';

const criarColaboradores = () => ({
  repository: {
    listarPaginado: jest.fn(),
    buscarPorId: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
    deletar: jest.fn().mockResolvedValue(undefined),
  },
  questionarioRepository: { listar: jest.fn().mockResolvedValue([]) },
  candidaturaModel: { aggregate: jest.fn().mockResolvedValue([]), exists: jest.fn().mockResolvedValue(null) },
  catalogoService: { garantirReferencias: jest.fn().mockResolvedValue(undefined) },
  questionarioService: { excluirComPerguntas: jest.fn().mockResolvedValue(undefined) },
  respostaQuestionarioRepository: { contarRespostasPorQuestionario: jest.fn().mockResolvedValue(0) },
});

const montarService = (c) =>
  new VagaService(
    c.repository,
    c.questionarioRepository,
    c.candidaturaModel,
    c.catalogoService,
    c.questionarioService,
    c.respostaQuestionarioRepository,
  );

const erroDe = (mensagem, statusCode, code) =>
  expect.objectContaining({ constructor: AppError, message: mensagem, statusCode, code });

describe('VagaService', () => {
  let colaboradores;
  let service;

  beforeEach(() => {
    colaboradores = criarColaboradores();
    service = montarService(colaboradores);
  });

  describe('sanitize', () => {
    it('remove __v da vaga e de cada critério', () => {
      const vaga = { _id: ID, __v: 3, titulo: 'Dev', criterio_vaga: [{ nome: 'React', __v: 0 }] };

      expect(service.sanitize(vaga)).toEqual({ _id: ID, titulo: 'Dev', criterio_vaga: [{ nome: 'React' }] });
    });

    it('usa toObject quando recebe documento Mongoose', () => {
      const documento = { toObject: () => ({ _id: ID, __v: 1, titulo: 'Dev' }) };

      expect(service.sanitize(documento)).toEqual({ _id: ID, titulo: 'Dev' });
    });

    it('devolve null para vaga ausente', () => {
      expect(service.sanitize(null)).toBeNull();
    });
  });

  describe('ensureStatusTransition', () => {
    it.each([
      ['ativa', 'pausada'],
      ['ativa', 'arquivada'],
      ['pausada', 'ativa'],
      ['pausada', 'arquivada'],
      ['arquivada', 'arquivada'],
    ])('permite mover de %s para %s', (atual, novo) => {
      expect(() => service.ensureStatusTransition(atual, novo)).not.toThrow();
    });

    it('ignora quando o payload não traz status', () => {
      expect(() => service.ensureStatusTransition('arquivada', undefined)).not.toThrow();
    });

    it.each([
      ['arquivada', 'ativa', 'Não é possível mover a vaga de Encerrada para Ativa.'],
      ['arquivada', 'pausada', 'Não é possível mover a vaga de Encerrada para Pausada.'],
    ])('bloqueia reabrir vaga encerrada (%s → %s)', (atual, novo, mensagem) => {
      expect(() => service.ensureStatusTransition(atual, novo)).toThrow(
        erroDe(mensagem, 400, 'BUSINESS_RULE_ERROR'),
      );
    });

    it('usa o próprio valor como rótulo quando o status é desconhecido', () => {
      expect(() => service.ensureStatusTransition('rascunho', 'ativa')).toThrow(
        'Não é possível mover a vaga de rascunho para Ativa.',
      );
    });
  });

  describe('listar', () => {
    it('anexa o total de candidatos de cada vaga com uma única agregação', async () => {
      colaboradores.repository.listarPaginado.mockResolvedValue({
        docs: [{ _id: ID, __v: 0, titulo: 'A' }, { _id: OUTRO_ID, titulo: 'B' }],
        totalDocs: 2,
        page: 1,
      });
      colaboradores.candidaturaModel.aggregate.mockResolvedValue([{ _id: ID, total: 4 }]);

      const resultado = await service.listar({ page: 1 });

      expect(colaboradores.repository.listarPaginado).toHaveBeenCalledWith({ page: 1 });
      expect(colaboradores.candidaturaModel.aggregate).toHaveBeenCalledTimes(1);
      expect(colaboradores.candidaturaModel.aggregate).toHaveBeenCalledWith([
        { $match: { vagaId: { $in: [ID, OUTRO_ID] } } },
        { $group: { _id: '$vagaId', total: { $sum: 1 } } },
      ]);
      expect(resultado).toEqual({
        totalDocs: 2,
        page: 1,
        docs: [
          { _id: ID, titulo: 'A', totalCandidatos: 4 },
          { _id: OUTRO_ID, titulo: 'B', totalCandidatos: 0 },
        ],
      });
    });

    it('não agrega quando a página vem vazia', async () => {
      colaboradores.repository.listarPaginado.mockResolvedValue({ docs: [], totalDocs: 0 });

      await expect(service.listar({})).resolves.toEqual({ docs: [], totalDocs: 0 });
      expect(colaboradores.candidaturaModel.aggregate).not.toHaveBeenCalled();
    });
  });

  describe('buscarPorId', () => {
    it('rejeita ID inválido sem consultar o repositório', async () => {
      await expect(service.buscarPorId('abc')).rejects.toEqual(
        erroDe('ID de vaga inválido.', 400, 'VALIDATION_ERROR'),
      );
      expect(colaboradores.repository.buscarPorId).not.toHaveBeenCalled();
    });

    it('lança 404 quando a vaga não existe', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue(null);

      await expect(service.buscarPorId(ID)).rejects.toEqual(erroDe('Vaga não encontrada.', 404, 'NOT_FOUND'));
    });

    it('devolve a vaga sanitizada para quem gerencia, mesmo fora do ar', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, __v: 0, status: 'pausada' });

      await expect(service.buscarPorId(ID)).resolves.toEqual({ _id: ID, status: 'pausada' });
      expect(colaboradores.candidaturaModel.exists).not.toHaveBeenCalled();
    });

    it('mostra vaga ativa ao candidato sem checar inscrição', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, status: 'ativa' });

      await expect(service.buscarPorId(ID, { candidatoId: OUTRO_ID })).resolves.toEqual({ _id: ID, status: 'ativa' });
      expect(colaboradores.candidaturaModel.exists).not.toHaveBeenCalled();
    });

    it('mostra vaga fora do ar ao candidato que já se candidatou', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, status: 'arquivada' });
      colaboradores.candidaturaModel.exists.mockResolvedValue({ _id: 'c1' });

      await expect(service.buscarPorId(ID, { candidatoId: OUTRO_ID })).resolves.toEqual({
        _id: ID,
        status: 'arquivada',
      });
      expect(colaboradores.candidaturaModel.exists).toHaveBeenCalledWith({ usuarioId: OUTRO_ID, vagaId: ID });
    });

    it('esconde vaga fora do ar do candidato sem candidatura', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, status: 'pausada' });
      colaboradores.candidaturaModel.exists.mockResolvedValue(null);

      await expect(service.buscarPorId(ID, { candidatoId: OUTRO_ID })).rejects.toEqual(
        erroDe('Vaga não encontrada.', 404, 'NOT_FOUND'),
      );
    });
  });

  describe('garantirRequisitos', () => {
    it('monta as referências ao catálogo conforme o tipo de critério', async () => {
      await service.garantirRequisitos([
        { tipo_criterio: 'skill_tecnica', requisito: { itemId: 'h1' } },
        { tipo_criterio: 'formacao', requisito: { areaId: 'a1', itemId: 'ignorado' } },
        { tipo_criterio: 'idioma', descricao: 'sem requisito' },
        { tipo_criterio: 'experiencia', requisito: { areaId: 'a2' } },
        { tipo_criterio: 'certificacao', requisito: { itemId: 'c1' } },
      ]);

      expect(colaboradores.catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'habilidade', id: 'h1', campo: 'criterio_vaga[0].requisito.itemId' },
        { tipo: 'area_curso', id: 'a1', campo: 'criterio_vaga[1].requisito.areaId' },
        { tipo: 'area_atuacao', id: 'a2', campo: 'criterio_vaga[3].requisito.areaId' },
        { tipo: 'certificacao', id: 'c1', campo: 'criterio_vaga[4].requisito.itemId' },
      ]);
    });

    it('sem critérios, valida lista vazia', async () => {
      await service.garantirRequisitos();

      expect(colaboradores.catalogoService.garantirReferencias).toHaveBeenCalledWith([]);
    });

    it('propaga o erro do catálogo', async () => {
      const erro = new AppError('Item de catálogo inexistente.', 400, 'VALIDATION_ERROR');
      colaboradores.catalogoService.garantirReferencias.mockRejectedValue(erro);

      await expect(
        service.garantirRequisitos([{ tipo_criterio: 'skill_tecnica', requisito: { itemId: 'x' } }]),
      ).rejects.toBe(erro);
    });
  });

  describe('criar', () => {
    const documentoCriado = (dados) => ({ ...dados, toObject: () => ({ ...dados, __v: 0 }) });

    it('valida os requisitos antes de gravar e devolve a vaga sanitizada', async () => {
      const payload = {
        titulo: 'Dev',
        status: 'pausada',
        criterio_vaga: [{ tipo_criterio: 'skill_tecnica', requisito: { itemId: 'h1' } }],
      };
      colaboradores.repository.criar.mockResolvedValue(documentoCriado({ _id: ID, ...payload }));

      const resultado = await service.criar(payload);

      expect(colaboradores.catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'habilidade', id: 'h1', campo: 'criterio_vaga[0].requisito.itemId' },
      ]);
      expect(colaboradores.repository.criar).toHaveBeenCalledWith(payload);
      expect(colaboradores.questionarioRepository.listar).not.toHaveBeenCalled();
      expect(resultado).toEqual({ _id: ID, ...payload });
    });

    it('não grava a vaga quando um requisito não existe no catálogo', async () => {
      colaboradores.catalogoService.garantirReferencias.mockRejectedValue(new AppError('inexistente'));

      await expect(service.criar({ criterio_vaga: [] })).rejects.toThrow('inexistente');
      expect(colaboradores.repository.criar).not.toHaveBeenCalled();
    });

    it('vaga criada ativa exige questionário ativo', async () => {
      colaboradores.repository.criar.mockResolvedValue(documentoCriado({ _id: ID, status: 'ativa' }));
      colaboradores.questionarioRepository.listar.mockResolvedValue([]);

      await expect(service.criar({ status: 'ativa', criterio_vaga: [] })).rejects.toEqual(
        erroDe('Vaga só pode ser ativada com um questionário ativo.', 400, 'BUSINESS_RULE_ERROR'),
      );
      expect(colaboradores.questionarioRepository.listar).toHaveBeenCalledWith({ vagaId: ID, ativo: 1 });
    });

    it('vaga criada ativa passa quando já há questionário ativo', async () => {
      colaboradores.repository.criar.mockResolvedValue(documentoCriado({ _id: ID, status: 'ativa' }));
      colaboradores.questionarioRepository.listar.mockResolvedValue([{ id: 'q1' }]);

      await expect(service.criar({ status: 'ativa', criterio_vaga: [] })).resolves.toEqual({ _id: ID, status: 'ativa' });
    });
  });

  describe('atualizar', () => {
    it('rejeita ID inválido', async () => {
      await expect(service.atualizar('123', {})).rejects.toEqual(
        erroDe('ID de vaga inválido.', 400, 'VALIDATION_ERROR'),
      );
    });

    it('lança 404 quando a vaga não existe', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue(null);

      await expect(service.atualizar(ID, { titulo: 'x' })).rejects.toEqual(
        erroDe('Vaga não encontrada.', 404, 'NOT_FOUND'),
      );
      expect(colaboradores.repository.atualizar).not.toHaveBeenCalled();
    });

    it('bloqueia transição de status proibida sem gravar', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, status: 'arquivada' });

      await expect(service.atualizar(ID, { status: 'ativa' })).rejects.toEqual(
        erroDe('Não é possível mover a vaga de Encerrada para Ativa.', 400, 'BUSINESS_RULE_ERROR'),
      );
      expect(colaboradores.repository.atualizar).not.toHaveBeenCalled();
    });

    it('atualiza campos simples sem validar requisitos nem questionário', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, status: 'ativa' });
      colaboradores.repository.atualizar.mockResolvedValue({ _id: ID, __v: 2, titulo: 'Novo' });

      await expect(service.atualizar(ID, { titulo: 'Novo' })).resolves.toEqual({ _id: ID, titulo: 'Novo' });
      expect(colaboradores.repository.atualizar).toHaveBeenCalledWith(ID, { titulo: 'Novo' });
      expect(colaboradores.catalogoService.garantirReferencias).not.toHaveBeenCalled();
      expect(colaboradores.questionarioRepository.listar).not.toHaveBeenCalled();
    });

    it('revalida requisitos quando os critérios mudam', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, status: 'pausada' });
      colaboradores.repository.atualizar.mockResolvedValue({ _id: ID });
      const criterio_vaga = [{ tipo_criterio: 'experiencia', requisito: { areaId: 'a9' } }];

      await service.atualizar(ID, { criterio_vaga });

      expect(colaboradores.catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'area_atuacao', id: 'a9', campo: 'criterio_vaga[0].requisito.areaId' },
      ]);
    });

    it('não grava quando o requisito novo não existe no catálogo', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, status: 'pausada' });
      colaboradores.catalogoService.garantirReferencias.mockRejectedValue(new AppError('inexistente'));

      await expect(service.atualizar(ID, { criterio_vaga: [] })).rejects.toThrow('inexistente');
      expect(colaboradores.repository.atualizar).not.toHaveBeenCalled();
    });

    it('ativar vaga sem questionário ativo é bloqueado', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, status: 'pausada' });
      colaboradores.questionarioRepository.listar.mockResolvedValue([]);

      await expect(service.atualizar(ID, { status: 'ativa' })).rejects.toEqual(
        erroDe('Vaga só pode ser ativada com um questionário ativo.', 400, 'BUSINESS_RULE_ERROR'),
      );
      expect(colaboradores.questionarioRepository.listar).toHaveBeenCalledWith({ vagaId: ID, ativo: 1 });
      expect(colaboradores.repository.atualizar).not.toHaveBeenCalled();
    });

    it('ativa vaga pausada que tem questionário ativo', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, status: 'pausada' });
      colaboradores.questionarioRepository.listar.mockResolvedValue([{ id: 'q1' }]);
      colaboradores.repository.atualizar.mockResolvedValue({ _id: ID, status: 'ativa' });

      await expect(service.atualizar(ID, { status: 'ativa' })).resolves.toEqual({ _id: ID, status: 'ativa' });
      expect(colaboradores.repository.atualizar).toHaveBeenCalledWith(ID, { status: 'ativa' });
    });
  });

  describe('deletar', () => {
    beforeEach(() => {
      colaboradores.repository.buscarPorId.mockResolvedValue({ _id: ID, status: 'pausada' });
    });

    it('rejeita ID inválido', async () => {
      await expect(service.deletar('nada')).rejects.toEqual(erroDe('ID de vaga inválido.', 400, 'VALIDATION_ERROR'));
    });

    it('lança 404 quando a vaga não existe', async () => {
      colaboradores.repository.buscarPorId.mockResolvedValue(null);

      await expect(service.deletar(ID)).rejects.toEqual(erroDe('Vaga não encontrada.', 404, 'NOT_FOUND'));
      expect(colaboradores.repository.deletar).not.toHaveBeenCalled();
    });

    it('exclui a vaga e cada questionário com suas perguntas', async () => {
      colaboradores.questionarioRepository.listar.mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);

      await expect(service.deletar(ID)).resolves.toEqual({ id: ID, deletado: true });

      expect(colaboradores.questionarioRepository.listar).toHaveBeenCalledWith({ vagaId: ID });
      expect(colaboradores.candidaturaModel.exists).toHaveBeenCalledWith({ vagaId: ID });
      expect(colaboradores.respostaQuestionarioRepository.contarRespostasPorQuestionario).toHaveBeenCalledWith('q1');
      expect(colaboradores.respostaQuestionarioRepository.contarRespostasPorQuestionario).toHaveBeenCalledWith('q2');
      expect(colaboradores.repository.deletar).toHaveBeenCalledWith(ID);
      expect(colaboradores.questionarioService.excluirComPerguntas.mock.calls).toEqual([['q1'], ['q2']]);
    });

    it('bloqueia exclusão de vaga com candidatura', async () => {
      colaboradores.candidaturaModel.exists.mockResolvedValue({ _id: 'c1' });

      await expect(service.deletar(ID)).rejects.toEqual(
        erroDe(
          'Não é permitido excluir vaga com candidaturas ou respostas. Encerre a vaga para tirá-la do ar.',
          400,
          'BUSINESS_RULE_ERROR',
        ),
      );
      expect(colaboradores.repository.deletar).not.toHaveBeenCalled();
      expect(colaboradores.questionarioService.excluirComPerguntas).not.toHaveBeenCalled();
    });

    it('bloqueia exclusão quando algum questionário já tem resposta', async () => {
      colaboradores.questionarioRepository.listar.mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);
      colaboradores.respostaQuestionarioRepository.contarRespostasPorQuestionario
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(2);

      await expect(service.deletar(ID)).rejects.toMatchObject({ statusCode: 400, code: 'BUSINESS_RULE_ERROR' });
      expect(colaboradores.repository.deletar).not.toHaveBeenCalled();
    });
  });
});

import FormacaoService from '../../../service/FormacaoService.js';
import FormacaoRepository from '../../../repository/FormacaoRepository.js';
import CatalogoService from '../../../service/CatalogoService.js';

jest.mock('../../../repository/FormacaoRepository.js', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../../service/CatalogoService.js', () => ({ __esModule: true, default: jest.fn() }));

const USUARIO_ID = 'usuario-1';
const FORMACAO_ID = 'formacao-1';

const existente = {
  id: FORMACAO_ID,
  usuarioId: USUARIO_ID,
  curso: 'Computação',
  situacao: 'concluido',
  anoInicio: 2018,
  anoConclusao: 2022,
  __v: 0,
};

const naoEncontrada = { message: 'Formação não encontrada.', statusCode: 404, code: 'NOT_FOUND' };

const montarService = () => {
  const repository = {
    criar: jest.fn(async (dados) => ({ toObject: () => ({ id: FORMACAO_ID, ...dados, __v: 0 }) })),
    listarPorUsuarioId: jest.fn().mockResolvedValue([]),
    buscarPorUsuarioEId: jest.fn().mockResolvedValue(existente),
    atualizarPorUsuarioEId: jest.fn(async (usuarioId, id, dados) => ({ ...existente, ...dados })),
    deletarPorUsuarioEId: jest.fn().mockResolvedValue(existente),
  };
  const catalogoService = { garantirReferencias: jest.fn().mockResolvedValue(undefined) };
  return { service: new FormacaoService(repository, catalogoService), repository, catalogoService };
};

describe('FormacaoService', () => {
  it('instancia repositório e catálogo padrão quando não injetados', () => {
    const service = new FormacaoService();

    expect(service.formacaoRepository).toBeInstanceOf(FormacaoRepository);
    expect(service.catalogoService).toBeInstanceOf(CatalogoService);
  });

  describe('sanitize', () => {
    it('devolve null para documento ausente', () => {
      expect(montarService().service.sanitize(null)).toBeNull();
    });

    it('remove __v sem alterar o original', () => {
      const doc = { id: 'f1', __v: 2 };

      expect(montarService().service.sanitize(doc)).toEqual({ id: 'f1' });
      expect(doc.__v).toBe(2);
    });
  });

  describe('criarFormacao', () => {
    it('valida a área no catálogo e grava vinculada ao usuário', async () => {
      const { service, repository, catalogoService } = montarService();
      const payload = { curso: 'Computação', areaId: 'area-1' };

      const resultado = await service.criarFormacao(USUARIO_ID, payload);

      expect(catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'area_curso', id: 'area-1', campo: 'areaId' },
      ]);
      expect(repository.criar).toHaveBeenCalledWith({ ...payload, usuarioId: USUARIO_ID });
      expect(resultado).toEqual({ id: FORMACAO_ID, ...payload, usuarioId: USUARIO_ID });
    });

    it('não grava quando a área não pertence ao catálogo', async () => {
      const { service, repository, catalogoService } = montarService();
      catalogoService.garantirReferencias.mockRejectedValue(new Error('catálogo'));

      await expect(service.criarFormacao(USUARIO_ID, { areaId: 'x' })).rejects.toThrow('catálogo');
      expect(repository.criar).not.toHaveBeenCalled();
    });
  });

  describe('listarFormacao', () => {
    it('lista apenas as formações do usuário, sanitizadas', async () => {
      const { service, repository } = montarService();
      repository.listarPorUsuarioId.mockResolvedValue([{ id: 'f1', __v: 0 }, { id: 'f2', __v: 1 }]);

      const resultado = await service.listarFormacao(USUARIO_ID);

      expect(repository.listarPorUsuarioId).toHaveBeenCalledWith(USUARIO_ID);
      expect(resultado).toEqual([{ id: 'f1' }, { id: 'f2' }]);
    });
  });

  describe('atualizarFormacao', () => {
    it('responde 404 quando a formação não é do usuário', async () => {
      const { service, repository, catalogoService } = montarService();
      repository.buscarPorUsuarioEId.mockResolvedValue(null);

      await expect(service.atualizarFormacao('outro', FORMACAO_ID, {})).rejects.toMatchObject(naoEncontrada);
      expect(repository.buscarPorUsuarioEId).toHaveBeenCalledWith('outro', FORMACAO_ID);
      expect(catalogoService.garantirReferencias).not.toHaveBeenCalled();
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });

    it('não atualiza quando a área não pertence ao catálogo', async () => {
      const { service, repository, catalogoService } = montarService();
      catalogoService.garantirReferencias.mockRejectedValue(new Error('catálogo'));

      await expect(service.atualizarFormacao(USUARIO_ID, FORMACAO_ID, { areaId: 'x' })).rejects.toThrow('catálogo');
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });

    it('atualiza e devolve o registro sanitizado', async () => {
      const { service, repository, catalogoService } = montarService();
      const payload = { curso: 'Engenharia', areaId: 'area-2' };

      const resultado = await service.atualizarFormacao(USUARIO_ID, FORMACAO_ID, payload);

      expect(catalogoService.garantirReferencias).toHaveBeenCalledWith([
        { tipo: 'area_curso', id: 'area-2', campo: 'areaId' },
      ]);
      expect(repository.atualizarPorUsuarioEId).toHaveBeenCalledWith(USUARIO_ID, FORMACAO_ID, payload);
      expect(resultado).toEqual({ ...existente, ...payload, __v: undefined });
      expect(resultado).not.toHaveProperty('__v');
    });

    it.each([
      ['anoConclusao do payload menor que anoInicio existente', { anoConclusao: 2017 }],
      ['anoInicio do payload maior que anoConclusao existente', { anoInicio: 2023 }],
      ['ambos no payload invertidos', { anoInicio: 2020, anoConclusao: 2019 }],
    ])('rejeita com 400 quando %s', async (_, payload) => {
      const { service, repository } = montarService();

      await expect(service.atualizarFormacao(USUARIO_ID, FORMACAO_ID, payload)).rejects.toMatchObject({
        message: 'anoConclusao não pode ser menor que anoInicio.',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });

    it.each([
      ['mesmo ano de início e conclusão', { anoInicio: 2022 }],
      ['anoConclusao igual ao anoInicio existente', { anoConclusao: 2018 }],
      ['situação trancada sem ano de conclusão', { situacao: 'trancado', anoConclusao: null }],
    ])('aceita %s', async (_, payload) => {
      const { service, repository } = montarService();

      await service.atualizarFormacao(USUARIO_ID, FORMACAO_ID, payload);

      expect(repository.atualizarPorUsuarioEId).toHaveBeenCalledWith(USUARIO_ID, FORMACAO_ID, payload);
    });

    it.each([
      ['concluido', 'o ano de conclusão', { anoConclusao: null }, existente],
      ['cursando', 'a previsão de conclusão', { situacao: 'cursando', anoConclusao: null }, existente],
      ['concluido', 'o ano de conclusão', { situacao: 'concluido' }, { ...existente, situacao: 'trancado', anoConclusao: undefined }],
    ])('exige ano de conclusão para situação %s', async (situacao, campo, payload, registro) => {
      const { service, repository } = montarService();
      repository.buscarPorUsuarioEId.mockResolvedValue(registro);

      await expect(service.atualizarFormacao(USUARIO_ID, FORMACAO_ID, payload)).rejects.toMatchObject({
        message: `Informe ${campo} para formação com situação "${situacao}".`,
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(repository.atualizarPorUsuarioEId).not.toHaveBeenCalled();
    });
  });

  describe('deletarFormacao', () => {
    it('remove a formação do usuário', async () => {
      const { service, repository } = montarService();

      await expect(service.deletarFormacao(USUARIO_ID, FORMACAO_ID)).resolves.toEqual({ id: FORMACAO_ID, deletado: true });
      expect(repository.deletarPorUsuarioEId).toHaveBeenCalledWith(USUARIO_ID, FORMACAO_ID);
    });

    it('responde 404 quando a formação não é do usuário', async () => {
      const { service, repository } = montarService();
      repository.deletarPorUsuarioEId.mockResolvedValue(null);

      await expect(service.deletarFormacao('outro', FORMACAO_ID)).rejects.toMatchObject(naoEncontrada);
      expect(repository.deletarPorUsuarioEId).toHaveBeenCalledWith('outro', FORMACAO_ID);
    });
  });
});

import CatalogoService from './CatalogoService.js';
import AppError from '../utils/helpers/AppError.js';

jest.mock('../repository/CatalogoRepository.js', () => ({ __esModule: true, default: jest.fn() }));

const item = (id, tipo = 'habilidade', extra = {}) => ({ id, tipo, nome: id, sinonimos: [], implica: [], ...extra });

const montarService = () => {
  const repository = {
    buscarAtivos: jest.fn().mockResolvedValue([]),
    listarPorTipo: jest.fn().mockResolvedValue([]),
    listarTodos: jest.fn().mockResolvedValue([]),
    buscarPorIds: jest.fn().mockResolvedValue([]),
    buscarPorId: jest.fn().mockResolvedValue(item('i1', 'habilidade', { nome: 'JavaScript', sinonimos: ['JS'] })),
    criar: jest.fn(async (dados) => ({ toObject: () => ({ _id: 'oid', __v: 0, id: 'novo', ...dados }) })),
    atualizar: jest.fn(async (id, dados) => ({ _id: 'oid', __v: 0, ...item(id), ...dados })),
  };
  return { service: new CatalogoService(repository), repository };
};

const esperarAppError = async (promessa, { message, statusCode, code }) => {
  const erro = await promessa.then(
    () => {
      throw new Error('era esperado AppError');
    },
    (e) => e,
  );
  expect(erro).toBeInstanceOf(AppError);
  expect(erro.message).toBe(message);
  expect(erro.statusCode).toBe(statusCode);
  expect(erro.code).toBe(code);
};

const naoEncontrado = { message: 'Item do catálogo não encontrado.', statusCode: 404, code: 'NOT_FOUND' };
const duplicado = { message: 'Nome ou sinônimo já usado por outro item deste tipo.', statusCode: 409, code: 'CONFLICT' };
const implicaProprio = { message: 'implica não pode conter o próprio item.', statusCode: 400, code: 'VALIDATION_ERROR' };
const implicaInvalido = {
  message: 'implica aponta para item inexistente ou de outro tipo.',
  statusCode: 400,
  code: 'VALIDATION_ERROR',
};
const erroDuplicado = () => Object.assign(new Error('E11000'), { code: 11000 });

describe('CatalogoService', () => {
  it('instancia o repositório padrão quando nada é injetado', () => {
    expect(new CatalogoService().repository).toBeDefined();
  });

  describe('buscar', () => {
    it.each([
      ['Node.JS', 'nodejs'],
      ['  Ação Rápida ', 'acaorapida'],
      ['C#', 'c#'],
      [undefined, ''],
    ])('normaliza a busca %p para o prefixo %p e remove campos internos', async (q, prefixo) => {
      const { service, repository } = montarService();
      repository.buscarAtivos.mockResolvedValue([{ _id: 'x', __v: 0, ...item('i1') }]);

      const resultado = await service.buscar({ tipo: 'habilidade', q, limit: 5 });

      expect(repository.buscarAtivos).toHaveBeenCalledWith({ tipo: 'habilidade', prefixo, limit: 5 });
      expect(resultado).toEqual([item('i1')]);
    });
  });

  describe('listarPorTipo', () => {
    it('lista todos os itens do tipo sem campos internos', async () => {
      const { service, repository } = montarService();
      repository.listarPorTipo.mockResolvedValue([
        { _id: 'a', __v: 0, ...item('i1', 'certificacao', { ativo: false }) },
      ]);

      const resultado = await service.listarPorTipo('certificacao');

      expect(repository.listarPorTipo).toHaveBeenCalledWith('certificacao');
      expect(resultado).toEqual([item('i1', 'certificacao', { ativo: false })]);
    });
  });

  describe('validarImplica', () => {
    it('recusa implica que contém o próprio item', async () => {
      const { service, repository } = montarService();
      await esperarAppError(service.validarImplica('habilidade', ['i2', 'i1'], 'i1'), implicaProprio);
      expect(repository.buscarPorIds).not.toHaveBeenCalled();
    });

    it('aceita implica vazio sem consultar o banco', async () => {
      const { service, repository } = montarService();
      await expect(service.validarImplica('habilidade', [], 'i1')).resolves.toBeUndefined();
      expect(repository.buscarPorIds).not.toHaveBeenCalled();
    });

    it('aceita itens existentes do mesmo tipo, mesmo repetidos', async () => {
      const { service, repository } = montarService();
      repository.buscarPorIds.mockResolvedValue([item('i2'), item('i3')]);

      await expect(service.validarImplica('habilidade', ['i2', 'i3', 'i2'], null)).resolves.toBeUndefined();
      expect(repository.buscarPorIds).toHaveBeenCalledWith(['i2', 'i3', 'i2']);
    });

    it.each([
      ['item inexistente', [item('i2')]],
      ['item de outro tipo', [item('i2'), item('i3', 'certificacao')]],
    ])('recusa %s', async (_, encontrados) => {
      const { service, repository } = montarService();
      repository.buscarPorIds.mockResolvedValue(encontrados);

      await esperarAppError(service.validarImplica('habilidade', ['i2', 'i3'], null), implicaInvalido);
    });
  });

  describe('traduzirDuplicado', () => {
    it('converte erro de índice único em conflito', () => {
      const { service } = montarService();
      const erro = service.traduzirDuplicado(erroDuplicado());
      expect(erro).toBeInstanceOf(AppError);
      expect(erro).toMatchObject({ message: duplicado.message, statusCode: 409, code: 'CONFLICT' });
    });

    it.each([
      ['erro comum', new Error('falhou')],
      ['valor nulo', null],
    ])('devolve %s sem alteração', (_, erro) => {
      const { service } = montarService();
      expect(service.traduzirDuplicado(erro)).toBe(erro);
    });
  });

  describe('criar', () => {
    it('valida implica e devolve o item sem campos internos', async () => {
      const { service, repository } = montarService();
      repository.buscarPorIds.mockResolvedValue([item('i2')]);
      const payload = { tipo: 'habilidade', nome: 'React', implica: ['i2'] };

      const resultado = await service.criar(payload);

      expect(repository.buscarPorIds).toHaveBeenCalledWith(['i2']);
      expect(repository.criar).toHaveBeenCalledWith(payload);
      expect(resultado).toEqual({ id: 'novo', ...payload });
    });

    it('não cria quando implica é inválido', async () => {
      const { service, repository } = montarService();
      await esperarAppError(service.criar({ tipo: 'habilidade', nome: 'React', implica: ['i9'] }), implicaInvalido);
      expect(repository.criar).not.toHaveBeenCalled();
    });

    it('traduz nome ou sinônimo duplicado em conflito', async () => {
      const { service, repository } = montarService();
      repository.criar.mockRejectedValue(erroDuplicado());

      await esperarAppError(service.criar({ tipo: 'habilidade', nome: 'React', implica: [] }), duplicado);
    });

    it('propaga outros erros do repositório', async () => {
      const { service, repository } = montarService();
      const falha = new Error('banco fora');
      repository.criar.mockRejectedValue(falha);

      await expect(service.criar({ tipo: 'habilidade', nome: 'React', implica: [] })).rejects.toBe(falha);
    });
  });

  describe('atualizar', () => {
    it('recusa item inexistente', async () => {
      const { service, repository } = montarService();
      repository.buscarPorId.mockResolvedValue(null);

      await esperarAppError(service.atualizar('i9', { ativo: false }), naoEncontrado);
      expect(repository.atualizar).not.toHaveBeenCalled();
    });

    it('atualiza sem recalcular chaves nem validar implica quando não há nome, sinônimos ou implica', async () => {
      const { service, repository } = montarService();
      const resultado = await service.atualizar('i1', { ativo: false });

      expect(repository.buscarPorIds).not.toHaveBeenCalled();
      expect(repository.atualizar).toHaveBeenCalledWith('i1', { ativo: false });
      expect(resultado).not.toHaveProperty('_id');
      expect(resultado).not.toHaveProperty('__v');
      expect(resultado.ativo).toBe(false);
    });

    it.each([
      ['só o nome', { nome: 'TypeScript' }, ['typescript', 'js']],
      ['só os sinônimos', { sinonimos: ['ECMAScript', 'J.S.'] }, ['javascript', 'ecmascript', 'js']],
      ['nome e sinônimos', { nome: 'Node.js', sinonimos: ['Node'] }, ['nodejs', 'node']],
    ])('recalcula as chaves ao alterar %s', async (_, payload, chaves) => {
      const { service, repository } = montarService();
      await service.atualizar('i1', payload);

      expect(repository.atualizar).toHaveBeenCalledWith('i1', { ...payload, chaves });
    });

    it('valida implica com o tipo do item atual e o próprio id', async () => {
      const { service, repository } = montarService();
      await esperarAppError(service.atualizar('i1', { implica: ['i1'] }), implicaProprio);

      repository.buscarPorIds.mockResolvedValue([item('i2', 'certificacao')]);
      await esperarAppError(service.atualizar('i1', { implica: ['i2'] }), implicaInvalido);
      expect(repository.atualizar).not.toHaveBeenCalled();

      repository.buscarPorIds.mockResolvedValue([item('i2')]);
      await service.atualizar('i1', { implica: ['i2'] });
      expect(repository.atualizar).toHaveBeenCalledWith('i1', { implica: ['i2'] });
    });

    it('recusa quando o item some entre a leitura e a gravação', async () => {
      const { service, repository } = montarService();
      repository.atualizar.mockResolvedValue(null);

      await esperarAppError(service.atualizar('i1', { ativo: false }), naoEncontrado);
    });

    it('traduz sinônimo duplicado em conflito', async () => {
      const { service, repository } = montarService();
      repository.atualizar.mockRejectedValue(erroDuplicado());

      await esperarAppError(service.atualizar('i1', { sinonimos: ['TS'] }), duplicado);
    });
  });

  describe('carregarIndice', () => {
    it('monta o índice com todos os itens, inclusive inativos', async () => {
      const { service, repository } = montarService();
      const inativo = item('i2', 'habilidade', { ativo: false, chaves: ['react'] });
      repository.listarTodos.mockResolvedValue([item('i1', 'habilidade', { chaves: ['js', 'javascript'] }), inativo]);

      const indice = await service.carregarIndice();

      expect(indice.porId.get('i2')).toBe(inativo);
      expect(indice.porChave.get('habilidade:js')).toBe('i1');
      expect(indice.porChave.get('habilidade:react')).toBe('i2');
    });
  });

  describe('garantirReferencias', () => {
    it.each([
      ['sem argumento', undefined],
      ['lista vazia', []],
      ['refs sem id', [{ tipo: 'habilidade', id: '', campo: 'requisito' }]],
    ])('não consulta o banco com %s', async (_, refs) => {
      const { service, repository } = montarService();
      await expect(service.garantirReferencias(refs)).resolves.toBeUndefined();
      expect(repository.buscarPorIds).not.toHaveBeenCalled();
    });

    it('aceita referências existentes do tipo certo e consulta ids sem repetição', async () => {
      const { service, repository } = montarService();
      repository.buscarPorIds.mockResolvedValue([item('i1'), item('c1', 'certificacao')]);

      await expect(
        service.garantirReferencias([
          { tipo: 'habilidade', id: 'i1', campo: 'skills[0]' },
          { tipo: 'habilidade', id: 'i1', campo: 'skills[1]' },
          { tipo: 'certificacao', id: 'c1', campo: 'certificacoes[0]' },
          { tipo: 'habilidade', id: null, campo: 'skills[2]' },
        ]),
      ).resolves.toBeUndefined();
      expect(repository.buscarPorIds).toHaveBeenCalledWith(['i1', 'c1']);
    });

    it.each([
      ['inexistente', []],
      ['de outro tipo', [item('i1', 'certificacao')]],
    ])('recusa referência %s apontando o campo', async (_, encontrados) => {
      const { service, repository } = montarService();
      repository.buscarPorIds.mockResolvedValue(encontrados);

      await esperarAppError(service.garantirReferencias([{ tipo: 'habilidade', id: 'i1', campo: 'skills[0]' }]), {
        message: 'skills[0] não corresponde a item do catálogo do tipo habilidade.',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });
  });
});

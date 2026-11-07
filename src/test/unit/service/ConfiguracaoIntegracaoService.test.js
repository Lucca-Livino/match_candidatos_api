import ConfiguracaoIntegracaoService from '../../../service/ConfiguracaoIntegracaoService.js';
import AppError from '../../../utils/helpers/AppError.js';

jest.mock('../../../repository/ConfiguracaoIntegracaoRepository.js', () => ({ __esModule: true, default: jest.fn() }));

const configPadrao = {
  provedor: 'gemini',
  limiteCompatibilidade: 0.6,
  temperatura: 0.2,
  cascata: ['gemini-2.5-flash'],
  ativo: true,
  __v: 0,
};

const montarService = () => {
  const repository = {
    obterOuCriar: jest.fn().mockResolvedValue(configPadrao),
    atualizar: jest.fn(async (dados) => ({ ...configPadrao, ...dados })),
  };
  return { service: new ConfiguracaoIntegracaoService(repository), repository };
};

const chaveOriginal = process.env.GEMINI_API_KEY;

afterEach(() => {
  if (chaveOriginal === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = chaveOriginal;
});

describe('ConfiguracaoIntegracaoService', () => {
  it('instancia o repositório padrão quando nada é injetado', () => {
    expect(new ConfiguracaoIntegracaoService().repository).toBeDefined();
  });

  describe('decorarComStatusDasChaves', () => {
    it.each([
      ['configurada', 'chave-secreta', true],
      ['vazia', '', false],
      ['ausente', undefined, false],
    ])('informa chave %s sem expor o valor', (_, valor, esperado) => {
      if (valor === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = valor;
      const { service } = montarService();

      const resultado = service.decorarComStatusDasChaves(configPadrao);

      expect(resultado.chavesConfiguradas).toEqual({ gemini: esperado });
      expect(resultado).not.toHaveProperty('__v');
      expect(JSON.stringify(resultado)).not.toContain('chave-secreta');
    });
  });

  describe('obter', () => {
    it('obtém ou cria a configuração e decora com o status das chaves', async () => {
      process.env.GEMINI_API_KEY = 'x';
      const { service, repository } = montarService();

      const resultado = await service.obter();

      expect(repository.obterOuCriar).toHaveBeenCalledTimes(1);
      const { __v, ...semVersao } = configPadrao;
      expect(resultado).toEqual({ ...semVersao, chavesConfiguradas: { gemini: true } });
    });
  });

  describe('atualizar', () => {
    it('grava apenas os campos validados e normalizados com o autor', async () => {
      delete process.env.GEMINI_API_KEY;
      const { service, repository } = montarService();

      const resultado = await service.atualizar(
        { limiteCompatibilidade: '0.8', provedor: ' gemini ', cascata: [' a ', '', 'b'], extra: 1 },
        'admin-1',
      );

      expect(repository.atualizar).toHaveBeenCalledWith(
        { limiteCompatibilidade: 0.8, provedor: 'gemini', cascata: ['a', 'b'] },
        'admin-1',
      );
      expect(resultado).toMatchObject({ limiteCompatibilidade: 0.8, cascata: ['a', 'b'], chavesConfiguradas: { gemini: false } });
    });

    it.each([
      [0, false],
      [1, true],
    ])('converte o kill switch ativo %p em booleano', async (ativo, esperado) => {
      const { service, repository } = montarService();
      const resultado = await service.atualizar({ ativo }, 'admin-1');

      expect(repository.atualizar).toHaveBeenCalledWith({ ativo: esperado }, 'admin-1');
      expect(resultado.ativo).toBe(esperado);
    });

    it.each([
      ['payload nulo', null, 'Payload inválido.'],
      ['payload sem campo conhecido', { extra: 1 }, 'Nenhum campo válido informado.'],
      ['limite acima de 1', { limiteCompatibilidade: 1.5 }, 'limiteCompatibilidade deve estar entre 0 e 1.'],
      ['provedor desconhecido', { provedor: 'openai' }, 'provedor inválido.'],
      ['temperatura negativa', { temperatura: -0.1 }, 'temperatura deve estar entre 0 e 1.'],
      ['cascata vazia', { cascata: [' '] }, 'cascata precisa de pelo menos um modelo.'],
      ['cascata repetida', { cascata: ['a', 'a'] }, 'cascata não pode repetir modelo.'],
    ])('recusa %s sem gravar', async (_, payload, mensagem) => {
      const { service, repository } = montarService();
      const erro = await service.atualizar(payload, 'admin-1').catch((e) => e);

      expect(erro).toBeInstanceOf(AppError);
      expect(erro.message).toBe(mensagem);
      expect(erro.statusCode).toBe(400);
      expect(erro.code).toBe('VALIDATION_ERROR');
      expect(repository.atualizar).not.toHaveBeenCalled();
    });
  });
});

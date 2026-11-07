import ConfiguracaoIntegracaoRepository from '../../../repository/ConfiguracaoIntegracaoRepository.js';
import ConfiguracaoIntegracao from '../../../models/ConfiguracaoIntegracao.js';

const consulta = (resultado) => ({ lean: jest.fn().mockResolvedValue(resultado) });

describe('ConfiguracaoIntegracaoRepository', () => {
  const repo = new ConfiguracaoIntegracaoRepository();

  afterEach(() => jest.restoreAllMocks());

  it('obterOuCriar devolve a configuração existente sem criar', async () => {
    jest.spyOn(ConfiguracaoIntegracao, 'findOne').mockReturnValue(consulta({ id: 'c1' }));
    const create = jest.spyOn(ConfiguracaoIntegracao, 'create');

    await expect(repo.obterOuCriar()).resolves.toEqual({ id: 'c1' });
    expect(ConfiguracaoIntegracao.findOne).toHaveBeenCalledWith();
    expect(create).not.toHaveBeenCalled();
  });

  it('obterOuCriar cria configuração padrão quando não existe', async () => {
    jest.spyOn(ConfiguracaoIntegracao, 'findOne').mockReturnValue(consulta(null));
    jest.spyOn(ConfiguracaoIntegracao, 'create').mockResolvedValue({ toObject: () => ({ id: 'novo' }) });

    await expect(repo.obterOuCriar()).resolves.toEqual({ id: 'novo' });
    expect(ConfiguracaoIntegracao.create).toHaveBeenCalledWith({});
  });

  it('atualizar aplica o payload e o autor na configuração atual', async () => {
    jest.spyOn(repo, 'obterOuCriar').mockResolvedValue({ id: 'c1' });
    jest.spyOn(ConfiguracaoIntegracao, 'findOneAndUpdate').mockReturnValue(consulta({ id: 'c1', modelo: 'm' }));

    await expect(repo.atualizar({ modelo: 'm' }, 'u1')).resolves.toEqual({ id: 'c1', modelo: 'm' });
    expect(ConfiguracaoIntegracao.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 'c1' },
      { modelo: 'm', atualizadoPor: 'u1' },
      { returnDocument: 'after', runValidators: true },
    );
  });
});

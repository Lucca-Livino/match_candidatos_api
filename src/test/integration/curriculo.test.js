import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import FormacaoRepository from '../../repository/FormacaoRepository.js';

describe('FormacaoRepository (usuarioId)', () => {
  const repo = new FormacaoRepository();
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  it('cria e lista formacao por usuarioId', async () => {
    const usuarioId = 'user-1';
    await repo.criar({
      usuarioId,
      instituicao: 'UFAM',
      curso: 'CC',
      grau: 'graduacao',
      situacao: 'concluido',
      anoInicio: 2018,
      anoConclusao: 2022,
    });

    const lista = await repo.listarPorUsuarioId(usuarioId);
    expect(lista).toHaveLength(1);
    expect(lista[0].usuarioId).toBe(usuarioId);
  });
});

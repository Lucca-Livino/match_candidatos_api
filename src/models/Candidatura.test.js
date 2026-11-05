import Candidatura from './Candidatura.js';

describe('Candidatura.suspeitaInjecao', () => {
  it('nasce nula', () => {
    expect(new Candidatura({ usuarioId: 'u1', vagaId: 'v1' }).suspeitaInjecao).toBeNull();
  });

  it('aceita as três origens e recusa outra', () => {
    const valida = new Candidatura({
      usuarioId: 'u1',
      vagaId: 'v1',
      suspeitaInjecao: { detectada: true, origens: ['padrao', 'modelo', 'evidencia'], trechos: ['x'] },
    });
    expect(valida.validateSync()).toBeUndefined();

    const invalida = new Candidatura({
      usuarioId: 'u1',
      vagaId: 'v1',
      suspeitaInjecao: { detectada: true, origens: ['outra'], trechos: [] },
    });
    expect(invalida.validateSync().errors).toHaveProperty(['suspeitaInjecao.origens.0']);
  });
});

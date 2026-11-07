import Candidatura from '../../../models/Candidatura.js';

describe('Candidatura.suspeitaInjecao', () => {
  it('nasce nula', () => {
    expect(new Candidatura({ usuarioId: 'u1', vagaId: 'v1' }).suspeitaInjecao).toBeNull();
  });

  it('aceita as duas origens e recusa outra', () => {
    const valida = new Candidatura({
      usuarioId: 'u1',
      vagaId: 'v1',
      suspeitaInjecao: { detectada: true, origens: ['padrao', 'modelo'], trechos: ['x'] },
    });
    expect(valida.validateSync()).toBeUndefined();

    const invalida = new Candidatura({
      usuarioId: 'u1',
      vagaId: 'v1',
      suspeitaInjecao: { detectada: true, origens: ['evidencia'], trechos: [] },
    });
    expect(invalida.validateSync().errors).toHaveProperty(['suspeitaInjecao.origens.0']);
  });
});

import { situacaoDoUsuario, filtroDaSituacao, SITUACOES_USUARIO } from './situacaoUsuario.js';

describe('situacaoDoUsuario', () => {
  it('desativado vence qualquer outro estado', () => {
    expect(situacaoDoUsuario({ status_ativo: false, convidadoEm: new Date(), ativadoEm: null })).toBe('desativado');
  });

  it('pendente quando convidado e ainda nao ativado', () => {
    expect(situacaoDoUsuario({ status_ativo: true, convidadoEm: new Date(), ativadoEm: null })).toBe('pendente');
  });

  it('ativo quando o convite ja foi aceito', () => {
    expect(situacaoDoUsuario({ status_ativo: true, convidadoEm: new Date(), ativadoEm: new Date() })).toBe('ativo');
  });

  it('ativo para conta antiga, sem campos de convite', () => {
    expect(situacaoDoUsuario({ status_ativo: true })).toBe('ativo');
  });
});

describe('filtroDaSituacao', () => {
  it('lista as tres situacoes', () => {
    expect(SITUACOES_USUARIO).toEqual(['pendente', 'ativo', 'desativado']);
  });

  it('desativado filtra por status_ativo false', () => {
    expect(filtroDaSituacao('desativado')).toEqual({ status_ativo: false });
  });

  it('pendente exige convidadoEm e ausencia de ativadoEm', () => {
    expect(filtroDaSituacao('pendente')).toEqual({
      status_ativo: { $ne: false },
      convidadoEm: { $ne: null },
      ativadoEm: null,
    });
  });

  it('ativo aceita conta sem convite ou com convite aceito', () => {
    expect(filtroDaSituacao('ativo')).toEqual({
      status_ativo: { $ne: false },
      $or: [{ convidadoEm: null }, { ativadoEm: { $ne: null } }],
    });
  });

  it('sem situacao nao filtra', () => {
    expect(filtroDaSituacao(undefined)).toEqual({});
  });
});

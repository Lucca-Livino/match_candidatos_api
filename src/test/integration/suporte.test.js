import { TIPOS_PERMISSAO } from '../../models/Usuario.js';
import PermissaoService from '../../service/PermissaoService.js';

describe('papel suporte', () => {
  it('aceita suporte em tipos_permissao', () => {
    expect(TIPOS_PERMISSAO).toContain('suporte');
  });

  it('permite suporte em GET /configuracao-integracao', () => {
    const service = new PermissaoService();
    const usuario = { _id: 'u1', tipos_permissao: ['suporte'] };
    const resultado = service.validarAcessoPorPapel(
      usuario,
      '/configuracao-integracao',
      'GET',
    );
    expect(resultado).toEqual({ encontrou: true, permitido: true });
  });

  it('nega recrutador em PATCH /configuracao-integracao', () => {
    const service = new PermissaoService();
    const usuario = { _id: 'u2', tipos_permissao: ['recrutador'] };
    const resultado = service.validarAcessoPorPapel(
      usuario,
      '/configuracao-integracao',
      'PATCH',
    );
    expect(resultado).toEqual({ encontrou: true, permitido: false });
  });

  it('nega administrador em PATCH /configuracao-integracao', () => {
    const service = new PermissaoService();
    const usuario = { _id: 'u3', tipos_permissao: ['administrador'] };
    const resultado = service.validarAcessoPorPapel(
      usuario,
      '/configuracao-integracao',
      'PATCH',
    );
    expect(resultado).toEqual({ encontrou: true, permitido: false });
  });
});

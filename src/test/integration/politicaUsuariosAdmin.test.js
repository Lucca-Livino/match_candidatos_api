import PermissaoService from '../../service/PermissaoService.js';

const service = new PermissaoService();
const ID = '64b7f0c2a1b2c3d4e5f60718';
const acesso = (papel, caminho, metodo, id = 'u1') =>
  service.validarAcessoPorPapel({ _id: id, tipos_permissao: [papel] }, caminho, metodo).permitido;

describe('politicas das rotas de administracao de usuarios', () => {
  it.each([
    ['/usuarios/convite', 'POST'],
    [`/usuarios/${ID}/reenviar-convite`, 'POST'],
    [`/usuarios/${ID}/status`, 'PATCH'],
  ])('administrador pode %s %s', (caminho, metodo) => {
    expect(acesso('administrador', caminho, metodo)).toBe(true);
  });

  it.each(['recrutador', 'suporte', 'candidato'])('%s nao convida', (papel) => {
    expect(acesso(papel, '/usuarios/convite', 'POST')).toBe(false);
  });

  it.each(['recrutador', 'suporte', 'candidato'])('%s nao altera status de ninguem', (papel) => {
    expect(acesso(papel, `/usuarios/${ID}/status`, 'PATCH')).toBe(false);
  });

  it('ninguem altera o proprio status por allowSelf', () => {
    expect(acesso('recrutador', `/usuarios/${ID}/status`, 'PATCH', ID)).toBe(false);
  });

  it('suporte nao reenvia convite', () => {
    expect(acesso('suporte', `/usuarios/${ID}/reenviar-convite`, 'POST')).toBe(false);
  });
});

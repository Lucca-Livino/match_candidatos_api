import Grupo from '../../../models/Grupo.js';

const preSave = (doc) => Grupo.schema.s.hooks.execPre('save', doc, []);

describe('Grupo model', () => {
  it('aplica os padrões do grupo e das permissões', () => {
    const grupo = new Grupo({ nome: 'rh', descricao: 'Recursos humanos', permissions: [{ route: 'vagas' }] });

    expect(grupo.validateSync()).toBeUndefined();
    expect(grupo.ativo).toBe(true);
    expect(grupo.permissions[0].toObject()).toMatchObject({
      route: 'vagas',
      active: false,
      get: false,
      post: false,
      put: false,
      patch: false,
      delete: false,
    });
  });

  it('exige descrição e rota de cada permissão', () => {
    const erros = new Grupo({ permissions: [{}] }).validateSync().errors;

    expect(Object.keys(erros)).toEqual(expect.arrayContaining(['descricao', 'permissions.0.route']));
  });

  it('aceita a mesma rota em domínios diferentes', async () => {
    const grupo = new Grupo({
      descricao: 'x',
      permissions: [
        { route: 'vagas', domain: 'a' },
        { route: 'vagas', domain: 'b' },
      ],
    });

    await expect(preSave(grupo)).resolves.not.toThrow();
  });

  it('rejeita permissões repetidas de rota e domínio', async () => {
    const grupo = new Grupo({
      descricao: 'x',
      permissions: [
        { route: 'vagas', domain: 'a' },
        { route: 'vagas', domain: 'a' },
      ],
    });

    await expect(preSave(grupo)).rejects.toThrow('Permissões duplicadas');
  });
});

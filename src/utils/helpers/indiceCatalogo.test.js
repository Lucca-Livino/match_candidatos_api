import { montarIndice, resolver, expandir } from './indiceCatalogo.js';

const ITENS = [
  { id: 'sql', tipo: 'habilidade', nome: 'SQL', chaves: ['sql'], implica: [] },
  { id: 'pg', tipo: 'habilidade', nome: 'PostgreSQL', chaves: ['postgresql', 'postgres'], implica: ['sql'] },
  { id: 'orm', tipo: 'habilidade', nome: 'Prisma', chaves: ['prisma'], implica: ['pg'] },
  { id: 'comp', tipo: 'area_curso', nome: 'Computacao', chaves: ['computacao', 'cienciadacomputacao'], implica: [] },
];

describe('indiceCatalogo', () => {
  const indice = montarIndice(ITENS);

  it('resolve pelo id quando ele existe e e do tipo', () => {
    expect(resolver(indice, 'habilidade', { id: 'pg', texto: 'qualquer' })).toBe('pg');
  });

  it('ignora id de outro tipo e cai para o texto', () => {
    expect(resolver(indice, 'habilidade', { id: 'comp', texto: 'SQL' })).toBe('sql');
  });

  it('resolve texto livre por chave exata', () => {
    expect(resolver(indice, 'habilidade', { texto: 'Postgres' })).toBe('pg');
    expect(resolver(indice, 'area_curso', { texto: 'Ciência da Computação' })).toBe('comp');
  });

  it('nao resolve por pedaco de texto', () => {
    expect(resolver(indice, 'habilidade', { texto: 'Postgre' })).toBeNull();
    expect(resolver(indice, 'habilidade', { texto: 'SQL Server avancado' })).toBeNull();
  });

  it('expande implica em um nivel so', () => {
    expect([...expandir(indice, ['pg'])].sort()).toEqual(['pg', 'sql']);
    expect([...expandir(indice, ['orm'])].sort()).toEqual(['orm', 'pg']);
  });

  it('ignora nulos ao expandir', () => {
    expect([...expandir(indice, [null, 'sql'])]).toEqual(['sql']);
  });

  it('monta índice vazio sem itens e com item sem chaves', () => {
    expect(montarIndice().porId.size).toBe(0);

    const semChaves = montarIndice([{ id: 'x', tipo: 'habilidade' }]);
    expect(semChaves.porId.get('x')).toEqual({ id: 'x', tipo: 'habilidade' });
    expect(semChaves.porChave.size).toBe(0);
  });

  it('cai para o texto quando o id não está no catálogo', () => {
    expect(resolver(indice, 'habilidade', { id: 'inexistente', texto: 'SQL' })).toBe('sql');
  });

  it.each([undefined, {}, { texto: '' }])('não resolve sem id nem texto (%j)', (item) => {
    expect(resolver(indice, 'habilidade', item)).toBeNull();
  });

  it('expande sem ids e mantém id fora do catálogo ou sem implica', () => {
    expect(expandir(indice).size).toBe(0);

    const semImplica = montarIndice([{ id: 'x', tipo: 'habilidade', chaves: ['x'] }]);
    expect([...expandir(semImplica, ['x', 'fora'])]).toEqual(['x', 'fora']);
  });
});

import { normalizarChave } from './normalizarChave.js';

describe('normalizarChave', () => {
  it.each([
    ['Node.js', 'nodejs'],
    ['node js', 'nodejs'],
    ['NodeJS', 'nodejs'],
    ['Ciência da Computação', 'cienciadacomputacao'],
    ['  PostgreSQL  ', 'postgresql'],
    ['Front-end', 'frontend'],
    ['CI/CD', 'cicd'],
  ])('%s -> %s', (entrada, saida) => {
    expect(normalizarChave(entrada)).toBe(saida);
  });

  it('preserva + e # para nao fundir C, C++ e C#', () => {
    expect(new Set(['C', 'C++', 'C#'].map(normalizarChave)).size).toBe(3);
  });

  it('devolve string vazia para valor ausente', () => {
    expect(normalizarChave(null)).toBe('');
    expect(normalizarChave(undefined)).toBe('');
  });
});

import {
  validateCreateItemCatalogo,
  validateUpdateItemCatalogo,
  validateBuscaCatalogo,
} from '../../../../utils/validators/catalogoValidators.js';

describe('catalogoValidators', () => {
  it('normaliza criacao', () => {
    expect(
      validateCreateItemCatalogo({ tipo: 'habilidade', nome: ' SQL ', sinonimos: [' sql ansi ', ''], implica: [] }),
    ).toEqual({ tipo: 'habilidade', nome: 'SQL', sinonimos: ['sql ansi'], implica: [] });
  });

  it('recusa tipo invalido', () => {
    expect(() => validateCreateItemCatalogo({ tipo: 'idioma', nome: 'Ingles' })).toThrow('tipo inválido.');
  });

  it('recusa nome vazio', () => {
    expect(() => validateCreateItemCatalogo({ tipo: 'habilidade', nome: ' ' })).toThrow('nome é obrigatório.');
  });

  it('recusa sinonimos que nao sao lista', () => {
    expect(() => validateCreateItemCatalogo({ tipo: 'habilidade', nome: 'SQL', sinonimos: 'x' })).toThrow(
      'sinonimos deve ser uma lista.',
    );
  });

  it('nao deixa trocar o tipo na atualizacao', () => {
    expect(() => validateUpdateItemCatalogo({ tipo: 'area_curso' })).toThrow('tipo não pode ser alterado.');
  });

  it('aceita desativar', () => {
    expect(validateUpdateItemCatalogo({ ativo: false })).toEqual({ ativo: false });
  });

  it('exige tipo na busca e limita o tamanho', () => {
    expect(() => validateBuscaCatalogo({})).toThrow('tipo inválido.');
    expect(validateBuscaCatalogo({ tipo: 'habilidade', q: 'po', limit: '500' })).toEqual({
      tipo: 'habilidade',
      q: 'po',
      limit: 50,
      todos: false,
    });
    expect(validateBuscaCatalogo({ tipo: 'habilidade', todos: 'true' }).todos).toBe(true);
  });

  it('recusa nome sem letras ou numeros', () => {
    for (const nome of ['-', '/', '.']) {
      expect(() => validateCreateItemCatalogo({ tipo: 'habilidade', nome })).toThrow(
        'nome precisa ter letras ou números.',
      );
    }
  });

  it('descarta sinonimos cuja chave fica vazia', () => {
    expect(
      validateCreateItemCatalogo({ tipo: 'habilidade', nome: 'SQL', sinonimos: ['-', ' / ', 'sql ansi'] }).sinonimos,
    ).toEqual(['sql ansi']);
  });

  it('deduplica implica na criacao e na atualizacao', () => {
    expect(validateCreateItemCatalogo({ tipo: 'habilidade', nome: 'SQL', implica: ['a', 'b', 'a'] }).implica).toEqual(['a', 'b']);
    expect(validateUpdateItemCatalogo({ implica: ['a', 'a'] }).implica).toEqual(['a']);
  });
});

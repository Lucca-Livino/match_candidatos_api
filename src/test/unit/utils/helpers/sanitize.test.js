import { sanitizeDoc } from '../../../../utils/helpers/sanitize.js';

describe('sanitizeDoc', () => {
  it('devolve null para documento ausente', () => {
    expect(sanitizeDoc(null)).toBeNull();
    expect(sanitizeDoc(undefined)).toBeNull();
  });

  it('remove __v de objeto simples sem alterar o original', () => {
    const doc = { _id: '1', nome: 'A', __v: 3 };

    expect(sanitizeDoc(doc)).toEqual({ _id: '1', nome: 'A' });
    expect(doc.__v).toBe(3);
  });

  it('usa toObject() quando é documento Mongoose', () => {
    const doc = { toObject: () => ({ _id: '1', __v: 0, senha: 'x' }) };

    expect(sanitizeDoc(doc)).toEqual({ _id: '1', senha: 'x' });
  });

  it('remove os campos extras pedidos', () => {
    expect(sanitizeDoc({ _id: '1', senha: 'x', token: 't', nome: 'A' }, ['senha', 'token'])).toEqual({
      _id: '1',
      nome: 'A',
    });
  });
});

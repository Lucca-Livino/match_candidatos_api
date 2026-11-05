import {
  ErroDeIA,
  ErroDeIAPermanente,
  ErroDeIARecuperavel,
  ErroDeCotaDiaria,
  ErroDeRespostaInvalida,
} from './errosIA.js';

describe('errosIA', () => {
  it('motivo cai na mensagem quando não é informado', () => {
    const erro = new ErroDeIA('falhou');

    expect(erro).toMatchObject({ message: 'falhou', motivo: 'falhou', causa: null, modelo: null });
  });

  it('guarda causa, modelo e motivo informados', () => {
    const causa = new Error('raiz');
    const erro = new ErroDeIAPermanente('chave inválida', { causa, modelo: 'm1', motivo: 'auth' });

    expect(erro).toMatchObject({ causa, modelo: 'm1', motivo: 'auth' });
  });

  it('name segue a subclasse', () => {
    expect(new ErroDeIAPermanente('x').name).toBe('ErroDeIAPermanente');
    expect(new ErroDeRespostaInvalida('x').name).toBe('ErroDeRespostaInvalida');
  });

  it('separa erros recuperáveis dos permanentes', () => {
    expect(new ErroDeRespostaInvalida('x')).toBeInstanceOf(ErroDeIARecuperavel);
    expect(new ErroDeCotaDiaria(null)).toBeInstanceOf(ErroDeIARecuperavel);
    expect(new ErroDeIAPermanente('x')).not.toBeInstanceOf(ErroDeIARecuperavel);
    expect(new ErroDeIAPermanente('x')).toBeInstanceOf(ErroDeIA);
  });

  it('cota diária cita o modelo quando informado', () => {
    const causa = new Error('429');

    expect(new ErroDeCotaDiaria(causa, 'gemini-x')).toMatchObject({
      message: 'cota diaria esgotada no modelo gemini-x',
      motivo: 'cota diaria (RPD) esgotada',
      modelo: 'gemini-x',
      causa,
    });
    expect(new ErroDeCotaDiaria(causa).message).toBe('cota diaria esgotada');
  });
});

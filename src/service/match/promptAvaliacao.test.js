import { montarMensagem, extrairJson, validarAvaliacao, SCHEMA_AVALIACAO } from './promptAvaliacao.js';
import { ErroDeRespostaInvalida } from '../../utils/helpers/errosIA.js';

const payload = {
  dataReferencia: '2026-11-02',
  vaga: { titulo: 'Dev', criterios: [{ id: 'c1' }] },
  curriculo: { habilidades: ['React'] },
  questionario: [{ perguntaId: 'p1', acertou: true }],
};

describe('montarMensagem', () => {
  it('separa cada bloco do payload na ordem esperada pela rubrica', () => {
    const linhas = montarMensagem(payload).split('\n');
    const marcadores = linhas.filter((l) => /^<\/?[a-z_]+>/.test(l));

    expect(marcadores).toEqual([
      '<data_referencia>2026-11-02</data_referencia>',
      '<vaga>',
      '</vaga>',
      '<curriculo>',
      '</curriculo>',
      '<respostas_questionario>',
      '</respostas_questionario>',
    ]);
  });

  it('serializa vaga, currículo e questionário como JSON', () => {
    const mensagem = montarMensagem(payload);

    expect(mensagem).toContain(JSON.stringify(payload.vaga, null, 2));
    expect(mensagem).toContain(JSON.stringify(payload.curriculo, null, 2));
    expect(mensagem).toContain(JSON.stringify(payload.questionario, null, 2));
  });
});

describe('extrairJson', () => {
  it('aceita cerca de markdown sem o rótulo json', () => {
    expect(extrairJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('aceita o rótulo em maiúsculas e espaços ao redor', () => {
    expect(extrairJson('  ```JSON {"a":1} ```  ')).toEqual({ a: 1 });
  });

  it('lança SyntaxError para texto vazio ou quebrado', () => {
    expect(() => extrairJson(undefined)).toThrow(SyntaxError);
    expect(() => extrairJson('{"a":')).toThrow(SyntaxError);
  });
});

describe('validarAvaliacao', () => {
  const criterio = (aderencia, extra = {}) => ({ criterioId: 'c1', aderencia, evidencia: 'x', atendido: true, ...extra });

  it.each([0, 1, 0.5])('aceita aderência %p', (aderencia) => {
    expect(validarAvaliacao({ criterios: [criterio(aderencia)], resumo: 'ok' }).criterios[0].aderencia).toBe(aderencia);
  });

  it.each([-0.1, 1.01, '0.5', NaN, Infinity, null, undefined])('recusa aderência %p', (aderencia) => {
    expect(() => validarAvaliacao({ criterios: [criterio(aderencia)] }, 'm1')).toThrow(
      expect.objectContaining({ motivo: 'aderencia_invalida', modelo: 'm1' }),
    );
  });

  it('converte criterioId numérico para string', () => {
    expect(validarAvaliacao({ criterios: [criterio(1, { criterioId: 7 })] }).criterios[0].criterioId).toBe('7');
  });

  it('usa resumo vazio quando ausente', () => {
    expect(validarAvaliacao({ criterios: [] }).resumo).toBe('');
  });

  it('recusa resultado nulo como ErroDeRespostaInvalida', () => {
    expect(() => validarAvaliacao(null)).toThrow(ErroDeRespostaInvalida);
  });

  it('recusa critério nulo dentro da lista', () => {
    expect(() => validarAvaliacao({ criterios: [null] })).toThrow(
      expect.objectContaining({ motivo: 'aderencia_invalida' }),
    );
  });
});

describe('SCHEMA_AVALIACAO', () => {
  it('exige os quatro campos de cada critério e não pede score', () => {
    expect(SCHEMA_AVALIACAO.properties.criterios.items.required).toEqual([
      'criterioId',
      'aderencia',
      'evidencia',
      'atendido',
    ]);
    expect(SCHEMA_AVALIACAO.required).toEqual(['criterios', 'resumo']);
    expect(SCHEMA_AVALIACAO.properties).not.toHaveProperty('score');
  });
});

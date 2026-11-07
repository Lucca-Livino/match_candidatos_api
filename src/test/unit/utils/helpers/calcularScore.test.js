import { calcularScore, detalharCriterios } from '../../../../utils/helpers/calcularScore.js';

const criterio = (id, peso) => ({ id, nome: id, peso_percentual: peso });
const nota = (criterioId, aderencia) => ({ criterioId, aderencia, evidencia: '', atendido: aderencia >= 0.5 });

describe('calcularScore', () => {
  it('pondera as notas pelos pesos quando eles somam 100', () => {
    const vaga = [criterio('a', 50), criterio('b', 30), criterio('c', 20)];
    const avaliados = [nota('a', 1), nota('b', 0.5), nota('c', 0)];

    expect(calcularScore(vaga, avaliados)).toBe(0.65);
  });

  it('divide pela soma real quando os pesos somam menos de 100', () => {
    const vaga = [criterio('a', 30), criterio('b', 10)];
    const avaliados = [nota('a', 1), nota('b', 0)];

    expect(calcularScore(vaga, avaliados)).toBe(0.75);
  });

  it('conta como 0 o criterio que o modelo omitiu', () => {
    const vaga = [criterio('a', 50), criterio('b', 50)];

    expect(calcularScore(vaga, [nota('a', 1)])).toBe(0.5);
  });

  it('ignora criterio da resposta que nao existe na vaga', () => {
    const vaga = [criterio('a', 100)];

    expect(calcularScore(vaga, [nota('a', 0.8), nota('inventado', 1)])).toBe(0.8);
  });

  it('casa pelo criterioId, nao pela ordem da resposta', () => {
    const vaga = [criterio('a', 80), criterio('b', 20)];

    expect(calcularScore(vaga, [nota('b', 1), nota('a', 0)])).toBe(0.2);
  });

  it('usa a primeira nota quando o modelo repete um criterio', () => {
    expect(calcularScore([criterio('a', 100)], [nota('a', 0.4), nota('a', 1)])).toBe(0.4);
  });

  it('faz media simples quando nenhum criterio tem peso', () => {
    const vaga = [criterio('a', 0), criterio('b', null)];

    expect(calcularScore(vaga, [nota('a', 1), nota('b', 0.5)])).toBe(0.75);
  });

  it('devolve 0 para vaga sem criterios', () => {
    expect(calcularScore([], [nota('a', 1)])).toBe(0);
  });

  it('pesos 20/20/60 com notas 1/1/0,5 da exatamente 0,70', () => {
    const vaga = [criterio('a', 20), criterio('b', 20), criterio('c', 60)];
    const score = calcularScore(vaga, [nota('a', 1), nota('b', 1), nota('c', 0.5)]);

    expect(score).toBe(0.7);
    expect(score >= 0.7).toBe(true);
  });

  it('caso D22: pesos 10/10/80 com notas 1/1/0,5 da 0,60 e nao promove', () => {
    const vaga = [criterio('a', 10), criterio('b', 10), criterio('c', 80)];
    const score = calcularScore(vaga, [nota('a', 1), nota('b', 1), nota('c', 0.5)]);

    expect(score).toBe(0.6);
    expect(score >= 0.7).toBe(false);
  });
});

describe('detalharCriterios', () => {
  it('grava nome, peso e nota de cada criterio da vaga, na ordem da vaga', () => {
    const vaga = [
      { id: 'a', nome: 'React', peso_percentual: 60, obrigatorio: true },
      { id: 'b', nome: 'TypeScript', peso_percentual: 40, obrigatorio: false },
    ];
    const avaliados = [
      { criterioId: 'b', aderencia: 0.5, evidencia: 'TS basico', atendido: true },
      { criterioId: 'a', aderencia: 1, evidencia: 'React avancado', atendido: true, omitido: false },
    ];

    expect(detalharCriterios(vaga, avaliados)).toEqual([
      { criterioId: 'a', nome: 'React', peso: 60, obrigatorio: true, aderencia: 1, evidencia: 'React avancado', atendido: true, omitido: false },
      { criterioId: 'b', nome: 'TypeScript', peso: 40, obrigatorio: false, aderencia: 0.5, evidencia: 'TS basico', atendido: true, omitido: false },
    ]);
  });

  it('registra o criterio omitido pelo modelo com a nota 0 que entrou na conta', () => {
    const vaga = [{ id: 'a', nome: 'React', peso_percentual: 100, obrigatorio: false }];

    expect(detalharCriterios(vaga, [])).toEqual([
      { criterioId: 'a', nome: 'React', peso: 100, obrigatorio: false, aderencia: 0, evidencia: '', atendido: false, omitido: true },
    ]);
  });

  it('usa a mesma nota que o score quando o modelo repete o criterio', () => {
    const vaga = [{ id: 'a', nome: 'React', peso_percentual: 100 }];
    const avaliados = [nota('a', 0.8), nota('a', 0.2)];

    expect(detalharCriterios(vaga, avaliados)[0].aderencia).toBe(calcularScore(vaga, avaliados));
  });
});

describe('valores ausentes', () => {
  it('sem argumentos o score é 0 e o detalhe é vazio', () => {
    expect(calcularScore()).toBe(0);
    expect(calcularScore([criterio('a', 100)])).toBe(0);
    expect(detalharCriterios()).toEqual([]);
  });

  it('trata peso, aderência e evidência ausentes como vazios', () => {
    const vaga = [{ id: 'a', nome: 'React' }];
    const avaliados = [{ criterioId: 'a', aderencia: 'n/a' }];

    expect(calcularScore(vaga, avaliados)).toBe(0);
    expect(detalharCriterios(vaga, avaliados)).toEqual([
      { criterioId: 'a', nome: 'React', peso: 0, obrigatorio: false, aderencia: 0, evidencia: '', atendido: false, omitido: false },
    ]);
  });
});

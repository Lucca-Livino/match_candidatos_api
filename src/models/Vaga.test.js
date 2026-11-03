import Vaga from './Vaga.js';

const base = { area: 'TI', titulo: 'Desenvolvedor', descricao: 'Vaga para desenvolvimento web' };
const criterio = (peso) => ({ nome: 'React', tipo_criterio: 'skill_tecnica', peso_percentual: peso });
const erroDaSoma = (dados) => new Vaga({ ...base, ...dados }).validateSync()?.errors?.criterio_vaga?.message;

describe('Vaga model', () => {
  it('aplica os padrões', () => {
    const vaga = new Vaga(base);

    expect(vaga.validateSync()).toBeUndefined();
    expect(vaga.status).toBe('ativa');
    expect(vaga.requisitos_gerais).toBe('');
    expect(vaga.criterio_vaga).toHaveLength(0);
  });

  it('aceita pesos que somam até 100', () => {
    expect(erroDaSoma({ criterio_vaga: [criterio(60), criterio(40)] })).toBeUndefined();
  });

  it('rejeita pesos que somam mais de 100', () => {
    expect(erroDaSoma({ criterio_vaga: [criterio(60), criterio(41)] })).toMatch('não pode ultrapassar 100');
  });

  it('rejeita criterio_vaga que não é lista', () => {
    expect(erroDaSoma({ criterio_vaga: null })).toMatch('não pode ultrapassar 100');
  });

  it('conta como 0 o critério sem peso, que falha só no required', () => {
    const erros = new Vaga({ ...base, criterio_vaga: [{ nome: 'React', tipo_criterio: 'skill_tecnica' }] }).validateSync()
      .errors;

    expect(Object.keys(erros)).toEqual(['criterio_vaga.0.peso_percentual']);
  });
});

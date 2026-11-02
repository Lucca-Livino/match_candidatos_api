import { validateCreateVaga } from './vagaValidators.js';

const base = (criterio) => ({
  titulo: 'Back-end',
  area: 'TI',
  descricao: 'Desenvolvimento de APIs.',
  criterio_vaga: [{ nome: 'SQL', tipo_criterio: 'skill_tecnica', peso_percentual: 50, ...criterio }],
});

describe('requisito do criterio', () => {
  it('exige requisito quando obrigatorio', () => {
    expect(() => validateCreateVaga(base({ obrigatorio: true }))).toThrow(
      'criterio_vaga[0].requisito é obrigatório para critério obrigatório.',
    );
  });

  it('descarta requisito de criterio nao obrigatorio', () => {
    const v = validateCreateVaga(base({ obrigatorio: false, requisito: { itemId: 'x' } }));
    expect(v.criterio_vaga[0].requisito).toBeUndefined();
  });

  it('habilidade: itemId e nivel opcional', () => {
    const v = validateCreateVaga(base({ obrigatorio: true, requisito: { itemId: 'sql', nivelMinimo: 'intermediario' } }));
    expect(v.criterio_vaga[0].requisito).toEqual({ itemId: 'sql', nivelMinimo: 'intermediario' });
    expect(() => validateCreateVaga(base({ obrigatorio: true, requisito: { itemId: 'sql', nivelMinimo: 'guru' } }))).toThrow('nivelMinimo inválido');
  });

  it('formacao: grau, area ou qualquer, aceitaCursando', () => {
    const v = validateCreateVaga(base({ tipo_criterio: 'formacao', obrigatorio: true, requisito: { grauMinimo: 'graduacao', areaId: null, aceitaCursando: true } }));
    expect(v.criterio_vaga[0].requisito).toEqual({ grauMinimo: 'graduacao', areaId: null, aceitaCursando: true });
    expect(() => validateCreateVaga(base({ tipo_criterio: 'formacao', obrigatorio: true, requisito: { grauMinimo: 'x' } }))).toThrow('grauMinimo inválido');
  });

  it('experiencia: area e meses inteiros nao negativos', () => {
    const v = validateCreateVaga(base({ tipo_criterio: 'experiencia', obrigatorio: true, requisito: { areaId: 'atend', mesesMinimos: 12 } }));
    expect(v.criterio_vaga[0].requisito).toEqual({ areaId: 'atend', mesesMinimos: 12 });
    expect(() => validateCreateVaga(base({ tipo_criterio: 'experiencia', obrigatorio: true, requisito: { areaId: 'atend', mesesMinimos: -1 } }))).toThrow('mesesMinimos inválido');
  });

  it('certificacao e habilidade exigem itemId', () => {
    expect(() => validateCreateVaga(base({ tipo_criterio: 'certificacao', obrigatorio: true, requisito: {} }))).toThrow('itemId é obrigatório');
  });

  it('aceitaCursando e mesesMinimos precisam ter tipo valido', () => {
    const exp = (requisito) => base({ tipo_criterio: 'experiencia', obrigatorio: true, requisito });
    expect(() => validateCreateVaga(base({ tipo_criterio: 'formacao', obrigatorio: true, requisito: { grauMinimo: 'graduacao', aceitaCursando: 'sim' } }))).toThrow('aceitaCursando deve ser booleano');
    expect(() => validateCreateVaga(exp({ areaId: 'a', mesesMinimos: true }))).toThrow('mesesMinimos inválido');
    expect(() => validateCreateVaga(exp({ areaId: 'a', mesesMinimos: [] }))).toThrow('mesesMinimos inválido');
    expect(() => validateCreateVaga(exp({ areaId: 'a', mesesMinimos: null }))).toThrow('mesesMinimos inválido');
    expect(validateCreateVaga(exp({ areaId: 'a', mesesMinimos: '12' })).criterio_vaga[0].requisito.mesesMinimos).toBe(12);
    expect(validateCreateVaga(exp({ areaId: 'a' })).criterio_vaga[0].requisito.mesesMinimos).toBe(0);
  });
});

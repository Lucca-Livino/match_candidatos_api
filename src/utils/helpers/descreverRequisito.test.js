import { descreverRequisito } from './descreverRequisito.js';
import { montarIndice } from './indiceCatalogo.js';

const indice = montarIndice([
  { id: 'sql', tipo: 'habilidade', nome: 'SQL', chaves: ['sql'], implica: [] },
  { id: 'comp', tipo: 'area_curso', nome: 'Computacao', chaves: ['computacao'], implica: [] },
  { id: 'atend', tipo: 'area_atuacao', nome: 'Atendimento ao cliente', chaves: [], implica: [] },
]);

describe('descreverRequisito', () => {
  it.each([
    [{ tipo_criterio: 'skill_tecnica', requisito: { itemId: 'sql', nivelMinimo: 'intermediario' } }, 'SQL, nivel minimo intermediario'],
    [{ tipo_criterio: 'skill_tecnica', requisito: { itemId: 'sql' } }, 'SQL'],
    [{ tipo_criterio: 'formacao', requisito: { grauMinimo: 'graduacao', areaId: 'comp', aceitaCursando: true } }, 'graduacao ou superior em Computacao, aceita em andamento'],
    [{ tipo_criterio: 'formacao', requisito: { grauMinimo: 'tecnico', areaId: null, aceitaCursando: false } }, 'tecnico ou superior em qualquer area, concluida'],
    [{ tipo_criterio: 'experiencia', requisito: { areaId: 'atend', mesesMinimos: 12 } }, 'Atendimento ao cliente, minimo de 12 meses'],
    [{ tipo_criterio: 'experiencia', requisito: { areaId: 'atend', mesesMinimos: 0 } }, 'Atendimento ao cliente'],
  ])('%j', (criterio, esperado) => {
    expect(descreverRequisito(criterio, indice)).toBe(esperado);
  });

  it('devolve null sem requisito', () => {
    expect(descreverRequisito({ tipo_criterio: 'skill_tecnica' }, indice)).toBeNull();
  });

  it('id ausente do indice nunca vaza: usa o nome do criterio', () => {
    expect(descreverRequisito({ nome: 'Banco de dados', tipo_criterio: 'skill_tecnica', requisito: { itemId: 'cat-zzz' } }, indice))
      .toBe('Banco de dados');
    expect(descreverRequisito({ nome: 'Atendimento', tipo_criterio: 'experiencia', requisito: { areaId: 'cat-zzz', mesesMinimos: 6 } }, indice))
      .toBe('Atendimento, minimo de 6 meses');
    expect(descreverRequisito({ nome: 'Curso X', tipo_criterio: 'formacao', requisito: { grauMinimo: 'tecnico', areaId: 'cat-zzz', aceitaCursando: false } }, indice))
      .toBe('tecnico ou superior em Curso X, concluida');
  });
});

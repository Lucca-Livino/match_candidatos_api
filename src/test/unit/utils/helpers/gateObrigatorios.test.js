import { avaliarObrigatorios } from '../../../../utils/helpers/gateObrigatorios.js';
import { montarIndice } from '../../../../utils/helpers/indiceCatalogo.js';
import { calcularChaves } from '../../../../models/ItemCatalogo.js';

const item = (id, tipo, nome, sinonimos = [], implica = []) => ({
  id, tipo, nome, implica, chaves: calcularChaves(nome, sinonimos),
});

const INDICE = montarIndice([
  item('sql', 'habilidade', 'SQL'),
  item('pg', 'habilidade', 'PostgreSQL', ['Postgres'], ['sql']),
  item('js', 'habilidade', 'JavaScript', ['JS']),
  item('java', 'habilidade', 'Java'),
  item('node', 'habilidade', 'Node.js', ['NodeJS', 'Node'], ['js']),
  item('react', 'habilidade', 'React', ['ReactJS'], ['js']),
  item('r', 'habilidade', 'R'),
  item('py', 'habilidade', 'Python'),
  item('excel', 'habilidade', 'Excel', ['Microsoft Excel']),
  item('comp', 'area_curso', 'Computacao', ['Ciencia da Computacao', 'Sistemas de Informacao']),
  item('direito', 'area_curso', 'Direito'),
  item('adm', 'area_curso', 'Administracao'),
  item('atend', 'area_atuacao', 'Atendimento ao cliente', ['Atendente']),
  item('aws', 'certificacao', 'AWS Certified Cloud Practitioner', ['AWS CCP']),
]);

const vazio = { habilidades: [], formacoes: [], experiencias: [], certificacoes: [] };
const crit = (nome, tipo_criterio, requisito) => ({ nome, tipo_criterio, obrigatorio: true, requisito });
const gate = (criterio, curriculo) => avaliarObrigatorios([criterio], { ...vazio, ...curriculo }, INDICE);

describe('gate de obrigatorios: regressao do casamento por pedaco de texto', () => {
  it.each([
    ['PostgreSQL comprova SQL', crit('Banco de dados SQL', 'skill_tecnica', { itemId: 'sql' }), { habilidades: [{ habilidade: 'PostgreSQL', nivel: 'intermediario' }] }],
    ['JS comprova JavaScript', crit('JavaScript', 'skill_tecnica', { itemId: 'js' }), { habilidades: [{ habilidade: 'JS', nivel: 'basico' }] }],
    ['NodeJS comprova Node.js', crit('Node.js', 'skill_tecnica', { itemId: 'node' }), { habilidades: [{ habilidade: 'NodeJS', nivel: 'avancado' }] }],
    ['Microsoft Excel comprova Excel', crit('Excel avancado', 'skill_tecnica', { itemId: 'excel' }), { habilidades: [{ habilidade: 'Microsoft Excel', nivel: 'avancado' }] }],
    ['Ciencia da Computacao comprova a area', crit('Ensino superior em computacao', 'formacao', { grauMinimo: 'graduacao', areaId: 'comp', aceitaCursando: false }), { formacoes: [{ curso: 'Ciência da Computação', grau: 'graduacao', situacao: 'concluido' }] }],
    ['Atendente comprova atendimento', crit('Experiencia em atendimento', 'experiencia', { areaId: 'atend', mesesMinimos: 0 }), { experiencias: [{ cargo: 'Atendente', mesesDuracao: 8 }] }],
  ])('passa: %s', (_, criterio, curriculo) => {
    expect(gate(criterio, curriculo).aprovado).toBe(true);
  });

  it.each([
    ['Java nao comprova JavaScript', crit('JavaScript', 'skill_tecnica', { itemId: 'js' }), { habilidades: [{ habilidade: 'Java', nivel: 'avancado' }] }],
    ['R nao comprova React', crit('React', 'skill_tecnica', { itemId: 'react' }), { habilidades: [{ habilidade: 'R', nivel: 'avancado' }] }],
    ['Py fora do catalogo nao comprova Python', crit('Python', 'skill_tecnica', { itemId: 'py' }), { habilidades: [{ habilidade: 'Py', nivel: 'avancado' }] }],
    ['Administracao nao comprova Direito', crit('Graduacao em Direito', 'formacao', { grauMinimo: 'graduacao', areaId: 'direito', aceitaCursando: false }), { formacoes: [{ curso: 'Administração', grau: 'graduacao', situacao: 'concluido' }] }],
  ])('barra: %s', (_, criterio, curriculo) => {
    expect(gate(criterio, curriculo).aprovado).toBe(false);
  });
});

describe('gate de obrigatorios: regras por tipo', () => {
  it('vinculo gravado vale mesmo com texto diferente', () => {
    const r = gate(crit('SQL', 'skill_tecnica', { itemId: 'sql' }), { habilidades: [{ habilidade: 'banco relacional', itemId: 'sql', nivel: 'basico' }] });
    expect(r.aprovado).toBe(true);
  });

  it('nivel minimo barra nivel menor e explica', () => {
    const r = gate(crit('SQL', 'skill_tecnica', { itemId: 'sql', nivelMinimo: 'intermediario' }), { habilidades: [{ habilidade: 'SQL', nivel: 'basico' }] });
    expect(r.aprovado).toBe(false);
    expect(r.motivos[0]).toBe('SQL: nível mínimo intermediário, declarado básico.');
  });

  it('nivel minimo aceita nivel maior', () => {
    expect(gate(crit('SQL', 'skill_tecnica', { itemId: 'sql', nivelMinimo: 'intermediario' }), { habilidades: [{ habilidade: 'SQL', nivel: 'especialista' }] }).aprovado).toBe(true);
  });

  it('formacao: qualquer area aceita so pelo grau', () => {
    expect(gate(crit('Superior completo', 'formacao', { grauMinimo: 'graduacao', areaId: null, aceitaCursando: false }), { formacoes: [{ curso: 'Letras', grau: 'pos_graduacao', situacao: 'concluido' }] }).aprovado).toBe(true);
  });

  it('formacao: grau abaixo do minimo barra', () => {
    expect(gate(crit('Superior', 'formacao', { grauMinimo: 'graduacao', areaId: 'comp', aceitaCursando: false }), { formacoes: [{ curso: 'Computação', grau: 'tecnico', situacao: 'concluido' }] }).aprovado).toBe(false);
  });

  it('formacao: cursando so vale quando aceito', () => {
    const cv = { formacoes: [{ curso: 'Computação', grau: 'graduacao', situacao: 'cursando' }] };
    expect(gate(crit('Sup', 'formacao', { grauMinimo: 'graduacao', areaId: 'comp', aceitaCursando: true }), cv).aprovado).toBe(true);
    expect(gate(crit('Sup', 'formacao', { grauMinimo: 'graduacao', areaId: 'comp', aceitaCursando: false }), cv).aprovado).toBe(false);
  });

  it('formacao: trancado nunca vale', () => {
    expect(gate(crit('Sup', 'formacao', { grauMinimo: 'graduacao', areaId: 'comp', aceitaCursando: true }), { formacoes: [{ curso: 'Computação', grau: 'graduacao', situacao: 'trancado' }] }).aprovado).toBe(false);
  });

  it('experiencia: soma os meses da mesma area', () => {
    const cv = { experiencias: [{ cargo: 'Atendente', mesesDuracao: 7 }, { cargo: 'Ajudante', areaId: 'atend', mesesDuracao: 6 }, { cargo: 'Programador', mesesDuracao: 40 }] };
    expect(gate(crit('Atendimento 1 ano', 'experiencia', { areaId: 'atend', mesesMinimos: 12 }), cv).aprovado).toBe(true);
    const r = gate(crit('Atendimento 2 anos', 'experiencia', { areaId: 'atend', mesesMinimos: 24 }), cv);
    expect(r.aprovado).toBe(false);
    expect(r.motivos[0]).toBe('Atendimento 2 anos: mínimo de 24 meses na área, encontrados 13.');
  });

  it('certificacao por sinonimo', () => {
    expect(gate(crit('AWS', 'certificacao', { itemId: 'aws' }), { certificacoes: [{ nome: 'AWS CCP' }] }).aprovado).toBe(true);
  });

  it('obrigatorio sem requisito (legado) nao barra: fica com a IA', () => {
    expect(gate({ nome: 'React', tipo_criterio: 'skill_tecnica', obrigatorio: true }, {}).aprovado).toBe(true);
  });

  it('criterio nao obrigatorio nunca barra', () => {
    expect(avaliarObrigatorios([{ ...crit('SQL', 'skill_tecnica', { itemId: 'sql' }), obrigatorio: false }], vazio, INDICE).aprovado).toBe(true);
  });

  it('lista faltantes e motivos de todos os obrigatorios que falham', () => {
    const r = avaliarObrigatorios(
      [crit('SQL', 'skill_tecnica', { itemId: 'sql' }), crit('AWS', 'certificacao', { itemId: 'aws' })],
      vazio,
      INDICE,
    );
    expect(r.faltantes).toEqual(['SQL', 'AWS']);
    expect(r.motivos).toEqual(['SQL: não encontrado no perfil.', 'AWS: não encontrado no perfil.']);
  });

  it.each([
    ['habilidade sem itemId', crit('SQL', 'skill_tecnica', {})],
    ['certificacao sem itemId', crit('AWS', 'certificacao', {})],
    ['experiencia sem areaId', crit('Atendimento', 'experiencia', { mesesMinimos: 12 })],
    ['formacao com grauMinimo invalido', crit('Sup', 'formacao', { grauMinimo: 'xyz', areaId: null, aceitaCursando: false })],
    ['habilidade com nivelMinimo invalido', crit('SQL', 'skill_tecnica', { itemId: 'sql', nivelMinimo: 'guru' })],
  ])('requisito malformado nao barra: %s', (_, criterio) => {
    const r = gate(criterio, { habilidades: [{ habilidade: 'SQL', nivel: 'basico' }] });
    expect(r.aprovado).toBe(true);
    expect(r.motivos).toEqual([]);
  });

  it('nivel ausente no perfil explica como nao informado', () => {
    const r = gate(crit('SQL', 'skill_tecnica', { itemId: 'sql', nivelMinimo: 'basico' }), { habilidades: [{ habilidade: 'SQL' }] });
    expect(r.aprovado).toBe(false);
    expect(r.motivos[0]).toBe('SQL: nível mínimo básico, declarado não informado.');
  });
});

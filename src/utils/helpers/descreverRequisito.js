// O requisito do criterio obrigatorio em texto, para a IA. Ela nao recebe ids
// do catalogo, so isto: a nota dela fica coerente com o que o gate exigiu.
// Id fora do indice nunca vai para a IA: cai para o nome do criterio.
const nomeDe = (indice, id, criterio) => indice.porId.get(id)?.nome ?? criterio.nome;

export const descreverRequisito = (criterio, indice) => {
  const r = criterio.requisito;
  if (!r) return null;

  if (criterio.tipo_criterio === 'skill_tecnica') {
    return r.nivelMinimo ? `${nomeDe(indice, r.itemId, criterio)}, nivel minimo ${r.nivelMinimo}` : nomeDe(indice, r.itemId, criterio);
  }
  if (criterio.tipo_criterio === 'formacao') {
    const area = r.areaId ? nomeDe(indice, r.areaId, criterio) : 'qualquer area';
    return `${r.grauMinimo} ou superior em ${area}, ${r.aceitaCursando ? 'aceita em andamento' : 'concluida'}`;
  }
  if (criterio.tipo_criterio === 'experiencia') {
    const area = nomeDe(indice, r.areaId, criterio);
    return r.mesesMinimos > 0 ? `${area}, minimo de ${r.mesesMinimos} meses` : area;
  }
  return nomeDe(indice, r.itemId, criterio);
};

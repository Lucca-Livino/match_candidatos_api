// Situacao de uma conta, derivada de tres campos do documento. Nao e gravada:
// guardar o rotulo abriria espaco para ele divergir dos campos que o definem.
export const SITUACOES_USUARIO = ['pendente', 'ativo', 'desativado'];

export function situacaoDoUsuario(usuario) {
  if (usuario?.status_ativo === false) return 'desativado';
  if (usuario?.convidadoEm && !usuario?.ativadoEm) return 'pendente';
  return 'ativo';
}

// `{ campo: null }` no Mongo casa tanto null quanto campo ausente, e as contas
// criadas antes do convite nao tem convidadoEm nem ativadoEm.
export function filtroDaSituacao(situacao) {
  if (situacao === 'desativado') return { status_ativo: false };
  if (situacao === 'pendente') {
    return { status_ativo: { $ne: false }, convidadoEm: { $ne: null }, ativadoEm: null };
  }
  if (situacao === 'ativo') {
    return {
      status_ativo: { $ne: false },
      $or: [{ convidadoEm: null }, { ativadoEm: { $ne: null } }],
    };
  }
  return {};
}

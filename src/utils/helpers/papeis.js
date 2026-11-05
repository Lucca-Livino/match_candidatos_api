// Quem conduz o processo seletivo. Estes papeis enxergam o que o candidato nao
// ve: vagas fora do ar e o gabarito dos questionarios.
const PAPEIS_DO_PROCESSO = ['administrador', 'recrutador'];

export const conduzProcesso = (req) =>
  (req.user?.tipos_permissao ?? []).some((papel) => PAPEIS_DO_PROCESSO.includes(papel));

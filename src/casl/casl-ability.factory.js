import { AbilityBuilder, createMongoAbility } from '@casl/ability';

/**
 * Define as habilidades (abilities) CASL para um usuário com base no seu papel.
 *
 * Cada usuário possui exatamente um papel, armazenado como o primeiro elemento
 * do array `tipos_permissao` do modelo Usuario.
 *
 * Sujeitos disponíveis:
 *   'Candidato' | 'Vaga' | 'Questionario' | 'Pergunta' | 'RespostaQuestionario' | 'Usuario' | 'all'
 *
 * @param {object} user - O objeto req.user enriquecido pelo authMiddleware
 * @returns {MongoAbility} Objeto de ability CASL
 */
export function defineAbilityFor(user) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  // Papel primário do usuário (único papel permitido por usuário)
  const role = user?.tipos_permissao?.[0];

  switch (role) {
    case 'administrador':
      // Acesso irrestrito a tudo
      can('manage', 'all');
      break;

    case 'recrutador':
      // Candidatos: somente leitura
      can('read', 'Candidato');
      cannot(['create', 'update', 'delete'], 'Candidato');

      // Vagas: acesso completo
      can('manage', 'Vaga');

      // Questionários: acesso completo
      can('manage', 'Questionario');

      // Perguntas: acesso completo
      can('manage', 'Pergunta');

      // RespostaQuestionario: sem acesso (nenhuma regra can → negado por padrão)
      break;

    case 'candidato':
      can('manage', 'Candidato');

      can('read', 'Vaga');

      can('read', 'Questionario');

      can('manage', 'RespostaQuestionario');

      // Perguntas: sem acesso (nenhuma regra can → negado por padrão)
      break;

    default:
      // Papel desconhecido ou ausente: sem permissões
      break;
  }

  return build();
}

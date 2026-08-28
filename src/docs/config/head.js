const getServersInCorrectOrder = () => {
  const prodUrl = {
    url: process.env.SWAGGER_PROD_URL || 'http://localhost:5000',
  };

  const devUrl = {
    url: process.env.SWAGGER_DEV_URL || 'http://localhost:5000',
  };

  return process.env.NODE_ENV === 'development' ? [devUrl, prodUrl] : [prodUrl, devUrl];
};

const getSwaggerOptions = async () => {
  const cacheBuster = process.env.NODE_ENV === 'development' ? `?t=${Date.now()}` : '';

  const authPaths = (await import(new URL('../paths/auth.js', import.meta.url).href + cacheBuster)).default;
  const usuarioPaths = (await import(new URL('../paths/usuario.js', import.meta.url).href + cacheBuster)).default;
  const usuarioCurriculoPaths = (await import(new URL('../paths/usuarioCurriculo.js', import.meta.url).href + cacheBuster)).default;
  const vagaPaths = (await import(new URL('../paths/vaga.js', import.meta.url).href + cacheBuster)).default;
  const questionarioPaths = (await import(new URL('../paths/questionario.js', import.meta.url).href + cacheBuster)).default;
  const rotaPaths = (await import(new URL('../paths/rota.js', import.meta.url).href + cacheBuster)).default;
  const grupoPaths = (await import(new URL('../paths/grupo.js', import.meta.url).href + cacheBuster)).default;
  const triagemIAPaths = (await import(new URL('../paths/triagemIA.js', import.meta.url).href + cacheBuster)).default;
  const authSchemas = (await import(new URL('../schemas/authSchema.js', import.meta.url).href + cacheBuster)).default;
  const usuarioSchemas = (await import(new URL('../schemas/usuarioSchema.js', import.meta.url).href + cacheBuster)).default;
  const vagaSchemas = (await import(new URL('../schemas/vagaSchema.js', import.meta.url).href + cacheBuster)).default;
  const candidatoSchemas = (await import(new URL('../schemas/candidatoSchema.js', import.meta.url).href + cacheBuster)).default;
  const questionarioSchemas =
    (await import(new URL('../schemas/questionarioSchema.js', import.meta.url).href + cacheBuster)).default;
  const rotaSchemas = (await import(new URL('../schemas/rotaSchema.js', import.meta.url).href + cacheBuster)).default;
  const grupoSchemas = (await import(new URL('../schemas/grupoSchema.js', import.meta.url).href + cacheBuster)).default;
  const triagemIASchemas =
    (await import(new URL('../schemas/triagemIASchema.js', import.meta.url).href + cacheBuster)).default;

  return {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Match de Curriculos API',
        version: '1.0.0',
        description: 'Documentacao das rotas da API Match de Curriculos.',
      },
      servers: getServersInCorrectOrder(),
      tags: [
        {
          name: 'Auth',
          description: 'Autenticacao com Better Auth (cadastro, login, sessao e perfil autenticado).',
        },
        {
          name: 'Usuarios RH',
          description: 'CRUD de usuarios com suporte a multi-perfil (recrutador e candidato).',
        },
        {
          name: 'Vagas RH',
          description: 'CRUD de vagas e criterios para montagem futura de questionarios de avaliacao.',
        },
        {
          name: 'Usuario Formacao',
          description: 'Operacoes de formacao academica do usuario.',
        },
        {
          name: 'Usuario Experiencia',
          description: 'Operacoes de experiencia profissional do usuario.',
        },
        {
          name: 'Usuario Habilidade',
          description: 'Operacoes de habilidades do usuario.',
        },
        {
          name: 'Usuario Certificacao',
          description: 'Operacoes de certificacoes do usuario.',
        },
        {
          name: 'Usuario Candidatura',
          description: 'Operacoes de candidatura do usuario em vagas.',
        },
        {
          name: 'Questionarios RH',
          description: 'Operacoes de criacao e gestao de questionarios avaliativos por vaga.',
        },
        {
          name: 'Perguntas de Questionario',
          description: 'Operacoes de perguntas, opcoes de resposta e ordenacao de questionarios.',
        },
        {
          name: 'Resposta de Questionario',
          description: 'Fluxo de resposta do candidato: iniciar, responder, finalizar e consultar.',
        },
        {
          name: 'Triagem por IA',
          description:
            'Avaliacao automatica de candidaturas: listagem sem ranking e reavaliacao manual.',
        },
        {
          name: 'Configuracao da IA (Suporte)',
          description:
            'Limiar, cascata de modelos e kill switch da triagem. Exclusiva do papel suporte.',
        },
        {
          name: 'Rotas (Admin)',
          description: 'CRUD administrativo das rotas registradas para o controle de permissoes.',
        },
        {
          name: 'Grupos (Admin)',
          description: 'CRUD administrativo dos grupos de permissao.',
        },
      ],
      paths: {
        ...authPaths,
        ...usuarioPaths,
        ...usuarioCurriculoPaths,
        ...vagaPaths,
        ...questionarioPaths,
        ...rotaPaths,
        ...grupoPaths,
        ...triagemIAPaths,
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          ...authSchemas,
          ...usuarioSchemas,
          ...vagaSchemas,
          ...candidatoSchemas,
          ...questionarioSchemas,
          ...rotaSchemas,
          ...grupoSchemas,
          ...triagemIASchemas,
        },
      },
    },
    apis: ['./src/routes/*.js'],
  };
};

export default getSwaggerOptions;

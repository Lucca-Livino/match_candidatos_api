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

  const usuarioPaths = (await import(new URL('../paths/usuario.js', import.meta.url).href + cacheBuster)).default;
  const vagaPaths = (await import(new URL('../paths/vaga.js', import.meta.url).href + cacheBuster)).default;
  const candidatoPaths = (await import(new URL('../paths/candidato.js', import.meta.url).href + cacheBuster)).default;
  const questionarioPaths = (await import(new URL('../paths/questionario.js', import.meta.url).href + cacheBuster)).default;
  const usuarioSchemas = (await import(new URL('../schemas/usuarioSchema.js', import.meta.url).href + cacheBuster)).default;
  const vagaSchemas = (await import(new URL('../schemas/vagaSchema.js', import.meta.url).href + cacheBuster)).default;
  const candidatoSchemas = (await import(new URL('../schemas/candidatoSchema.js', import.meta.url).href + cacheBuster)).default;
  const questionarioSchemas =
    (await import(new URL('../schemas/questionarioSchema.js', import.meta.url).href + cacheBuster)).default;

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
          name: 'Usuarios RH',
          description: 'CRUD de usuarios com suporte a multi-perfil (recrutador e candidato).',
        },
        {
          name: 'Vagas RH',
          description: 'CRUD de vagas e criterios para montagem futura de questionarios de avaliacao.',
        },
        {
          name: 'Candidatos',
          description: 'CRUD de candidato e perfil completo com dados relacionados.',
        },
        {
          name: 'Candidato Formacao',
          description: 'Operacoes de formacao academica do candidato.',
        },
        {
          name: 'Candidato Experiencia',
          description: 'Operacoes de experiencia profissional do candidato.',
        },
        {
          name: 'Candidato Habilidade',
          description: 'Operacoes de habilidades do candidato.',
        },
        {
          name: 'Candidato Certificacao',
          description: 'Operacoes de certificacoes do candidato.',
        },
        {
          name: 'Candidato Candidatura',
          description: 'Operacoes de candidatura do candidato em vagas.',
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
      ],
      paths: {
        ...usuarioPaths,
        ...vagaPaths,
        ...candidatoPaths,
        ...questionarioPaths,
      },
      components: {
        schemas: {
          ...usuarioSchemas,
          ...vagaSchemas,
          ...candidatoSchemas,
          ...questionarioSchemas,
        },
      },
    },
    apis: ['./src/routes/*.js'],
  };
};

export default getSwaggerOptions;

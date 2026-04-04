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
  const usuarioSchemas = (await import(new URL('../schemas/usuarioSchema.js', import.meta.url).href + cacheBuster)).default;

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
      ],
      paths: {
        ...usuarioPaths,
      },
      components: {
        schemas: {
          ...usuarioSchemas,
        },
      },
    },
    apis: ['./src/routes/*.js'],
  };
};

export default getSwaggerOptions;

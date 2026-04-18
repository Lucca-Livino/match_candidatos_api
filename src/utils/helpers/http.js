import AppError from './AppError.js';

export const sendSuccess = (res, data, statusCode = 200, message = 'Operacao realizada com sucesso.') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Recurso nao encontrado.',
    error: {
      code: 'NOT_FOUND',
      message: 'Recurso nao encontrado.',
    },
  });
};

export const errorHandler = (error, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      error: {
        code: error.code,
        message: error.message,
        details: isDev ? error.details : undefined,
      },
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Erro interno do servidor.',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor.',
      details: isDev ? error?.message : undefined,
    },
  });
};

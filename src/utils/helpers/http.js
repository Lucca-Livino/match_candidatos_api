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
    error: {
      code: 'NOT_FOUND',
      message: 'Recurso nao encontrado.',
    },
  });
};

export const errorHandler = (error, req, res, next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor.',
    },
  });
};

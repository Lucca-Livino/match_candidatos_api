import AppError from './AppError.js';

export const sendSuccess = (res, data, statusCode = 200, message = 'Operação realizada com sucesso.') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Recurso não encontrado.',
    error: {
      code: 'NOT_FOUND',
      message: 'Recurso não encontrado.',
    },
  });
};

const traduzirErroDoBanco = (error) => {
  if (error?.name === 'CastError') {
    return new AppError(`Valor inválido para ${error.path}.`, 400, 'VALIDATION_ERROR');
  }
  if (error?.code === 11000) {
    return new AppError('Já existe registro com estes dados.', 409, 'CONFLICT', error.keyValue);
  }
  return error;
};

export const errorHandler = (erroOriginal, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  const error = traduzirErroDoBanco(erroOriginal);

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

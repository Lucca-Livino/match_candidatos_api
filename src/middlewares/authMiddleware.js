import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../utils/auth.js';

export async function authMiddleware(req, res, next) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Nao autorizado. Faça login para continuar.',
      });
      return;
    }

    req.user = session.user;
    req.authSession = session.session;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      code: 'INVALID_SESSION',
      message: 'Token invalido ou sessao expirada.',
    });
  }
}

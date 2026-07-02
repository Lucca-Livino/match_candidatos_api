import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../utils/auth.js';
import Usuario from '../models/Usuario.js';

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

    const usuarioDoc = await Usuario.findOne({ email: session.user.email })
      .select('tipos_permissao groups permissions')
      .lean();

    req.user = {
      ...session.user,
      _id: usuarioDoc?._id ?? session.user.id,
      tipos_permissao: usuarioDoc?.tipos_permissao ?? [],
      groups: usuarioDoc?.groups ?? [],
      permissions: usuarioDoc?.permissions ?? [],
    };
    req.user_id = usuarioDoc?._id ?? session.user.id;
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

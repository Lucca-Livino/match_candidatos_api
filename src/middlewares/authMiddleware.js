import { fromNodeHeaders } from 'better-auth/node';
import mongoose from 'mongoose';
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

    // A busca casa email OU _id: depois da autoexclusao o email do documento
    // esta anonimizado e so o id da sessao ainda o alcanca. Sem o segundo
    // criterio o doc nao seria encontrado e a sessao residual passaria pelo
    // fallback como se fosse uma conta normal.
    const criterios = [{ email: session.user.email }];
    if (mongoose.Types.ObjectId.isValid(session.user.id)) {
      criterios.push({ _id: session.user.id });
    }

    const usuarioDoc = await Usuario.findOne({ $or: criterios })
      .select('tipos_permissao groups permissions deletadoEm')
      .lean();

    if (usuarioDoc?.deletadoEm) {
      res.status(401).json({
        success: false,
        code: 'CONTA_EXCLUIDA',
        message: 'Esta conta foi excluida.',
      });
      return;
    }

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

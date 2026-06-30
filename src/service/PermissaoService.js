import Usuario from '../models/Usuario.js';
import Rota from '../models/Rota.js';
import '../models/Grupo.js';
import politicasAcesso from '../config/politicasAcesso.js';

const MAPA_METODOS = { GET: 'get', POST: 'post', PUT: 'put', PATCH: 'patch', DELETE: 'delete' };

class PermissaoService {
  constructor({ usuarioModel = Usuario, rotaModel = Rota, politicas = politicasAcesso } = {}) {
    this.Usuario = usuarioModel;
    this.Rota = rotaModel;
    this.politicas = politicas;
  }

  normalizarCaminho(caminho) {
    if (!caminho) return '';
    const limpo = caminho.split('?')[0].toLowerCase();
    if (limpo.length > 1 && limpo.endsWith('/')) return limpo.slice(0, -1);
    return limpo;
  }

  obterNomeRota(caminho) {
    const segmento = this.normalizarCaminho(caminho).split('/').filter(Boolean)[0];
    return segmento ? segmento.toLowerCase() : '';
  }

  encontrarPolitica(caminho) {
    const normalizado = this.normalizarCaminho(caminho);
    return this.politicas.find((p) => p.pattern.test(normalizado)) || null;
  }

  validarAcessoPorPapel(usuario, caminho, metodoHttp) {
    const metodo = (metodoHttp || '').toUpperCase();
    const politica = this.encontrarPolitica(caminho);
    if (!politica) return { encontrou: false, permitido: false };

    const regra = politica.methods[metodo] || politica.methods['*'];
    if (!regra) return { encontrou: true, permitido: false };

    if (regra.allowSelf) {
      const correspondencia = this.normalizarCaminho(caminho).match(politica.pattern);
      const donoId = correspondencia?.[1];
      if (donoId && String(donoId) === String(usuario?._id)) {
        return { encontrou: true, permitido: true };
      }
    }

    const papel = usuario?.tipos_permissao?.[0];
    const permitido = Array.isArray(regra.roles) && regra.roles.includes(papel);
    return { encontrou: true, permitido };
  }

  possuiPermissaoGranular(usuario, rota, dominio, metodo) {
    let permissoes = Array.isArray(usuario.permissions) ? [...usuario.permissions] : [];
    if (Array.isArray(usuario.groups)) {
      for (const grupo of usuario.groups) {
        if (grupo && Array.isArray(grupo.permissions)) {
          permissoes = permissoes.concat(grupo.permissions);
        }
      }
    }
    return permissoes.some(
      (p) => p.route === rota && p.domain === dominio && p.active && p[metodo],
    );
  }

  async verificarPermissao({ usuarioId, caminho, metodoHttp, dominio }) {
    const metodo = MAPA_METODOS[(metodoHttp || '').toUpperCase()];
    if (!metodo) return { ok: false, status: 405, code: 'METHOD_NOT_ALLOWED' };

    const nomeRota = this.obterNomeRota(caminho);

    const rotaDb = await this.Rota.findOne({ route: nomeRota, domain: dominio }).lean();
    if (!rotaDb) return { ok: false, status: 404, code: 'ROUTE_NOT_FOUND' };
    if (!rotaDb.active || !rotaDb[metodo]) {
      return { ok: false, status: 403, code: 'ROUTE_DISABLED' };
    }

    const usuario = await this.Usuario.findById(usuarioId)
      .populate({ path: 'groups', select: 'permissions ativo' })
      .lean();
    if (!usuario) return { ok: false, status: 404, code: 'USER_NOT_FOUND' };

    const { encontrou, permitido } = this.validarAcessoPorPapel(usuario, caminho, metodoHttp);

    // Quando existe politica para o caminho/metodo, ela e autoritativa (allow ou deny final).
    if (encontrou) {
      return permitido ? { ok: true } : { ok: false, status: 403, code: 'FORBIDDEN' };
    }

    // Sem politica: cai para a camada granular (permissoes individuais + grupos).
    if (this.possuiPermissaoGranular(usuario, nomeRota, dominio, metodo)) {
      return { ok: true };
    }

    return { ok: false, status: 403, code: 'FORBIDDEN' };
  }
}

export default PermissaoService;

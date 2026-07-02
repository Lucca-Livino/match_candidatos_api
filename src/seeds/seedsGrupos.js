import 'dotenv/config';
import DbConnect from '../config/dbconnect.js';
import Grupo from '../models/Grupo.js';
import { rotasSeed } from './seedsRotas.js';

const DOMAIN = process.env.PERMISSION_DOMAIN || 'localhost';

const R = (m) => m.reduce((acc, k) => ({ ...acc, [k]: true }), {});
const perm = (route, methods) => ({ route, domain: DOMAIN, active: true, ...methods });

const gruposSeed = [
  {
    nome: 'administrador',
    descricao: 'Acesso total',
    permissions: rotasSeed.map((r) => perm(r.route, R(['get', 'post', 'put', 'patch', 'delete']))),
  },
  {
    nome: 'recrutador',
    descricao: 'Gestao de vagas, questionarios e perguntas',
    permissions: [
      perm('vagas', R(['get', 'post', 'patch', 'delete'])),
      perm('questionario', R(['get', 'post', 'put', 'patch', 'delete'])),
      perm('pergunta', R(['get', 'post', 'put', 'patch', 'delete'])),
      perm('usuarios', R(['get'])),
      perm('me', R(['get'])),
    ],
  },
  {
    nome: 'candidato',
    descricao: 'Curriculo proprio, vagas (leitura), respostas',
    permissions: [
      perm('vagas', R(['get'])),
      perm('questionario', R(['get'])),
      perm('resposta-questionario', R(['get', 'post', 'patch'])),
      perm('usuarios', R(['get', 'put', 'patch'])),
      perm('me', R(['get'])),
    ],
  },
];

async function seedGrupos({ useOwnConnection = true } = {}) {
  try {
    if (useOwnConnection) await DbConnect.conectar();

    for (const g of gruposSeed) {
      const doc = await Grupo.findOne({ nome: g.nome });
      if (doc) {
        doc.descricao = g.descricao;
        doc.permissions = g.permissions;
        await doc.save();
      } else {
        await Grupo.create(g);
      }
    }

    console.log(`Carga de grupos finalizada. ${gruposSeed.length} grupos.`);
  } finally {
    if (useOwnConnection) await DbConnect.desconectar();
  }
}

export default seedGrupos;

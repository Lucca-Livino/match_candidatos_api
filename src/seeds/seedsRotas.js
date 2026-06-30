import 'dotenv/config';
import DbConnect from '../config/dbconnect.js';
import Rota from '../models/Rota.js';

const DOMAIN = process.env.PERMISSION_DOMAIN || 'localhost';

const ALL = { active: true, get: true, post: true, put: true, patch: true, delete: true };

export const rotasSeed = [
  { route: 'usuarios', domain: DOMAIN, ...ALL },
  { route: 'vagas', domain: DOMAIN, active: true, get: true, post: true, patch: true, delete: true },
  { route: 'questionario', domain: DOMAIN, ...ALL },
  { route: 'pergunta', domain: DOMAIN, ...ALL },
  { route: 'resposta-questionario', domain: DOMAIN, active: true, get: true, post: true, patch: true },
  { route: 'me', domain: DOMAIN, active: true, get: true },
  { route: 'rotas', domain: DOMAIN, ...ALL },
  { route: 'grupos', domain: DOMAIN, ...ALL },
];

async function seedRotas({ useOwnConnection = true } = {}) {
  try {
    if (useOwnConnection) await DbConnect.conectar();

    for (const r of rotasSeed) {
      await Rota.findOneAndUpdate(
        { route: r.route, domain: r.domain },
        { $set: r },
        { upsert: true, new: true },
      );
    }

    console.log(`Carga de rotas finalizada. ${rotasSeed.length} rotas.`);
  } finally {
    if (useOwnConnection) await DbConnect.desconectar();
  }
}

export default seedRotas;

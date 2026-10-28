import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Rota from '../../../models/Rota.js';
import { rotasSeed } from '../../../seeds/seedsRotas.js';
import { EmailService } from '../../../service/EmailService.js';

// Ambiente e2e: Mongo em memoria + o app real (better-auth, RBAC, rotas).
//
// O app e importado DEPOIS da conexao: o better-auth le mongoose.connection.db
// no import de utils/auth.js e quebra se o banco ainda nao estiver de pe.

let mongoServer;

// Tokens de convite capturados no lugar do envio de e-mail, em ordem de envio.
export const convitesEnviados = [];

const neutralizarIntegracoesExternas = () => {
  // O .env de desenvolvimento pode ter credenciais reais. Vazias, o
  // EmailService nao cria transporter e o GoogleGenAI nunca recebe chave real.
  process.env.EMAIL_USER = '';
  process.env.EMAIL_APP_PASSWORD = '';
  process.env.GEMINI_API_KEY = 'chave-falsa-e2e';

  jest.spyOn(EmailService.prototype, 'enviarConvite').mockImplementation(async (dados) => {
    convitesEnviados.push(dados);
  });
};

export const semearRotas = async () => {
  for (const rota of rotasSeed) {
    await Rota.findOneAndUpdate({ route: rota.route, domain: rota.domain }, { $set: rota }, { upsert: true });
  }
};

export const subirAmbiente = async () => {
  neutralizarIntegracoesExternas();

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await semearRotas();

  const { default: app } = await import('../../../app.js');
  return app;
};

export const limparBanco = async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
  convitesEnviados.length = 0;
  await semearRotas();
};

export const derrubarAmbiente = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
};

// A avaliacao por IA roda em fire-and-forget depois do finalizar, entao o
// teste espera pela condicao em vez de por um tempo fixo.
export const aguardar = async (condicao, { tentativas = 50, intervaloMs = 50 } = {}) => {
  for (let i = 0; i < tentativas; i += 1) {
    const valor = await condicao();
    if (valor) return valor;
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }
  throw new Error('Condicao nao satisfeita dentro do tempo limite.');
};

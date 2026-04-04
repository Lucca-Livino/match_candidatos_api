import 'dotenv/config';
import DbConnect from '../config/dbconnect.js';
import Usuario from '../models/Usuario.js';

const usuariosSeed = [
  {
    nome: 'Ana Recrutadora',
    email: 'ana.recrutadora@match.com',
    tipos_permissao: ['recrutador'],
    status_ativo: true,
  },
  {
    nome: 'Bruno Candidato',
    email: 'bruno.candidato@match.com',
    tipos_permissao: ['candidato'],
    status_ativo: true,
  },
  {
    nome: 'Carla Multipla',
    email: 'carla.multipla@match.com',
    tipos_permissao: ['recrutador', 'candidato'],
    status_ativo: true,
  },
];

const runSeed = async () => {
  try {
    await DbConnect.conectar();

    for (const usuario of usuariosSeed) {
      await Usuario.findOneAndUpdate(
        { email: usuario.email },
        { $set: usuario },
        { upsert: true, returnDocument: 'after' },
      );
    }

    console.log(`Seed finalizado com sucesso. ${usuariosSeed.length} usuarios processados.`);
  } catch (error) {
    console.error('Erro ao executar seed de usuarios:', error);
    process.exitCode = 1;
  } finally {
    await DbConnect.desconectar();
  }
};

runSeed();

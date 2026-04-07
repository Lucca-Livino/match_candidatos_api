import 'dotenv/config';
import mongoose from 'mongoose';
import seedUsuario from './seedsUsuario.js';
import seedVaga from './seedsVaga.js';

async function main() {
  try {
    await seedUsuario();
    await seedVaga();

    console.log('>>> SEED FINALIZADO COM SUCESSO! <<<');
  } catch (err) {
    console.error('Erro ao executar SEED:', err);
    process.exitCode = 1;
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

main();

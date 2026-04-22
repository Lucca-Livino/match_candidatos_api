import 'dotenv/config';
import mongoose from 'mongoose';
import seedUsuario from './seedsUsuario.js';
import seedVaga from './seedsVaga.js';
import seedCandidato from './seedsCandidato.js';
import seedQuestionario from './seedsQuestionario.js';

async function main() {
  try {
    await seedUsuario();
    await seedVaga();
    await seedCandidato();
    await seedQuestionario();

    console.log('>>> CARGA DE DADOS FINALIZADA COM SUCESSO! <<<');
  } catch (err) {
    console.error('Erro ao executar carga de dados:', err);
    process.exitCode = 1;
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

main();

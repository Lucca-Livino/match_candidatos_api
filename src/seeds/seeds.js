import 'dotenv/config';
import DbConnect from '../config/dbconnect.js';
import seedRotas from './seedsRotas.js';
import seedGrupos from './seedsGrupos.js';
import seedUsuario from './seedsUsuario.js';
import seedVaga from './seedsVaga.js';
import seedQuestionario from './seedsQuestionario.js';

async function main() {
  try {
    await DbConnect.conectar();

    await seedRotas({ useOwnConnection: false });
    await seedGrupos({ useOwnConnection: false });
    await seedUsuario({ useOwnConnection: false });
    const vagas = await seedVaga({ useOwnConnection: false });
    await seedQuestionario({ vagas, useOwnConnection: false });

    console.log('>>> CARGA DE DADOS FINALIZADA COM SUCESSO! <<<');
  } catch (err) {
    console.error('Erro ao executar carga de dados:', err);
    process.exitCode = 1;
  } finally {
    await DbConnect.desconectar();
    process.exit(0);
  }
}

main();

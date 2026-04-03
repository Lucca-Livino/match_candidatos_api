import dotenv from 'dotenv';
import mongoose from 'mongoose';
import logger from './utils/logger.js';

dotenv.config();

class DbConnect {
  static async conectar() {
    try {
      const mongoURI = process.env.DB_URL;

      if (!mongoURI) {
        throw new Error('A variavel de ambiente DB_URL nao esta definida.');
      }

      logger.info('DB_URL esta definida.');

      // Configuracao de strictQuery baseada no ambiente
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        mongoose.set('strictQuery', false);
      } else {
        mongoose.set('strictQuery', true);
      }

      // Configuracoes condicionais para autoIndex e debug
      if (process.env.NODE_ENV === 'development') {
        mongoose.set('autoIndex', true); // Cria indices automaticamente
        mongoose.set('debug', true); // Ativa logs de debug
        logger.info('Configuracoes de desenvolvimento ativadas: autoIndex e debug.');
      } else {
        mongoose.set('autoIndex', false); // Desativa criacao automatica de indices
        mongoose.set('debug', false); // Desativa logs de debug
        logger.info('Configuracoes de producao ativadas: autoIndex e debug desativados.');
      }

      // Adiciona listeners para eventos do Mongoose
      mongoose.connection.on('connected', () => {
        logger.info('Mongoose conectado ao MongoDB.');
      });

      mongoose.connection.on('error', (err) => {
        logger.error(`Mongoose erro: ${err}`);
        if (process.env.NODE_ENV !== 'test') {
          // TODO: Implementar envio de email de erro
          // SendMail.enviaEmailErrorDbConnect(err, __filename, new Date());
        }
      });

      mongoose.connection.on('disconnected', () => {
        logger.info('Mongoose desconectado do MongoDB.');
      });

      // Conexao com opcoes configuraveis via variaveis de ambiente
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS
          ? parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10)
          : 5000,
        socketTimeoutMS: process.env.MONGO_SOCKET_TIMEOUT_MS
          ? parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS, 10)
          : 45000,
        connectTimeoutMS: process.env.MONGO_CONNECT_TIMEOUT_MS
          ? parseInt(process.env.MONGO_CONNECT_TIMEOUT_MS, 10)
          : 10000,
        retryWrites: true,
        maxPoolSize: process.env.MONGO_MAX_POOL_SIZE
          ? parseInt(process.env.MONGO_MAX_POOL_SIZE, 10)
          : 10,
      });

      logger.info('Conexao com o banco estabelecida!');
    } catch (error) {
      logger.error(
        `Erro na conexao com o banco de dados em ${new Date().toISOString()}: ${error.message}`,
      );
      if (process.env.NODE_ENV !== 'test') {
        // TODO: Implementar envio de email de erro
        // SendMail.enviaEmailErrorDbConnect(error, __filename, new Date());
      }
      throw error;
    }
  }

  static async desconectar() {
    try {
      await mongoose.disconnect();
      logger.info('Conexao com o banco encerrada!');
    } catch (error) {
      logger.error(
        `Erro ao desconectar do banco de dados em ${new Date().toISOString()}: ${error.message}`,
      );
      if (process.env.NODE_ENV !== 'test') {
        // TODO: Implementar envio de email de erro
        // SendMail.enviaEmailErrorDbConnect(error, __filename, new Date());
      }
      throw error;
    }
  }
}

export default DbConnect;

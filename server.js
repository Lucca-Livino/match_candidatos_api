import 'dotenv/config';
import DbConnect from './src/config/dbconnect.js';

const port = process.env.APP_PORT || process.env.API_PORT || 5000;

const bootstrap = async () => {
    try {
        await DbConnect.conectar();
        const { default: app } = await import('./src/app.js');

        app.listen(port, (error) => {
            if (error) {
                console.error('Erro ao iniciar o servidor:', error);
                process.exit(1);
            }

            console.log(`Servidor escutando em http://localhost:${port}`);
        });
    } catch (error) {
        console.error('Falha ao inicializar a aplicacao:', error);
        process.exit(1);
    }
};

bootstrap();
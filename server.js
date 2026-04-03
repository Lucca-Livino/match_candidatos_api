// server.js

import "dotenv/config";
import app from "./src/app.js";
const port = process.env.APP_PORT || process.env.API_PORT || 5000;

app.listen(port, (error) => {
    if (error) {
        console.error('Erro ao iniciar o servidor:', error);
        process.exit(1);
    } else {
        console.log(`Servidor escutando em http://localhost:${port}`)
    }
});
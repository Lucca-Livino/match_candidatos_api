import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import userRoutes from './routes/userRoutes.js';
import getSwaggerOptions from './docs/config/head.js';
import { errorHandler, notFoundHandler } from './utils/helpers/http.js';

const app = express();

app.use(express.json());

app.use(swaggerUI.serve);
app.get('/docs', async (req, res, next) => {
	const options = await getSwaggerOptions();
	const swaggerDocs = swaggerJSDoc(options);
	swaggerUI.setup(swaggerDocs)(req, res, next);
});

app.get('/health', (req, res) => {
	res.status(200).json({
		success: true,
		message: 'API saudavel.',
	});
});

app.use('/api', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

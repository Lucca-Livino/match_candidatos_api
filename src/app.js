import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import { auth } from './utils/auth.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import vagaRoutes from './routes/vagaRoutes.js';
import candidatoRoutes from './routes/candidatoRoutes.js';
import questionarioRoutes from './routes/questionarioRoutes.js';
import perguntaRoutes from './routes/perguntaRoutes.js';
import respostaQuestionarioRoutes from './routes/respostaQuestionarioRoutes.js';
import getSwaggerOptions from './docs/config/head.js';
import { errorHandler, notFoundHandler } from './utils/helpers/http.js';

const app = express();

app.all('/api/auth/*splat', toNodeHandler(auth));

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
app.use('/api', vagaRoutes);
app.use('/api', candidatoRoutes);
app.use('/api', questionarioRoutes);
app.use('/api', perguntaRoutes);
app.use('/api', respostaQuestionarioRoutes);
app.use('/api', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

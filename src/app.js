import express from 'express';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import { auth } from './utils/auth.js';
import authRoutes from './routes/authRoutes.js';
import { authMiddleware } from './middlewares/authMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import vagaRoutes from './routes/vagaRoutes.js';
import candidatoRoutes from './routes/candidatoRoutes.js';
import questionarioRoutes from './routes/questionarioRoutes.js';
import perguntaRoutes from './routes/perguntaRoutes.js';
import respostaQuestionarioRoutes from './routes/respostaQuestionarioRoutes.js';
import getSwaggerOptions from './docs/config/head.js';
import { errorHandler, notFoundHandler } from './utils/helpers/http.js';

const app = express();

const getAllowedOrigins = () => {
	if (!process.env.CORS_ORIGINS) {
		return ['http://localhost:5173'];
	}

	return process.env.CORS_ORIGINS.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();

app.use((req, res, next) => {
	const origin = req.headers.origin;

	if (origin && allowedOrigins.includes(origin)) {
		res.setHeader('Access-Control-Allow-Origin', origin);
		res.setHeader('Vary', 'Origin');
	}

	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	res.setHeader('Access-Control-Allow-Credentials', 'true');

	if (req.method === 'OPTIONS') {
		return res.sendStatus(204);
	}

	next();
});

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

app.use(swaggerUI.serve);
let _swaggerDocs = null;
app.get('/docs', async (req, res, next) => {
	if (!_swaggerDocs) {
		const options = await getSwaggerOptions();
		_swaggerDocs = swaggerJSDoc(options);
	}
	swaggerUI.setup(_swaggerDocs)(req, res, next);
});

app.get('/health', (req, res) => {
	res.status(200).json({
		success: true,
		message: 'API saudavel.',
	});
});

app.use('/api', (req, res, next) => {
	if (req.path.startsWith('/auth')) {
		return next();
	}

	return authMiddleware(req, res, next);
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

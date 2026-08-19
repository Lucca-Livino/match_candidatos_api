import express from 'express';
import ConfiguracaoIntegracaoController from '../controller/ConfiguracaoIntegracaoController.js';

const router = express.Router();
const controller = new ConfiguracaoIntegracaoController();

router.get('/configuracao-integracao', (req, res, next) => controller.obter(req, res, next));
router.patch('/configuracao-integracao', (req, res, next) => controller.atualizar(req, res, next));

export default router;

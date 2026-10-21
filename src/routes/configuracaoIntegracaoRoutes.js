import express from 'express';
import ConfiguracaoIntegracaoController from '../controller/ConfiguracaoIntegracaoController.js';
import CandidaturaController from '../controller/CandidaturaController.js';

const router = express.Router();
const controller = new ConfiguracaoIntegracaoController();
const candidaturaController = new CandidaturaController();

router.get('/configuracao-integracao', (req, res, next) => controller.obter(req, res, next));
router.patch('/configuracao-integracao', (req, res, next) => controller.atualizar(req, res, next));

// Observabilidade da triagem: exclusiva do suporte, expoe score e limiar.
router.get('/avaliacoes', (req, res, next) =>
  candidaturaController.listarParaAuditoria(req, res, next),
);

export default router;

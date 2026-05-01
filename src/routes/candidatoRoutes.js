import express from 'express';
import CandidatoController from '../controller/CandidatoController.js';
import FormacaoController from '../controller/FormacaoController.js';
import ExperienciaController from '../controller/ExperienciaController.js';
import HabilidadeController from '../controller/HabilidadeController.js';
import CertificacaoController from '../controller/CertificacaoController.js';
import CandidaturaController from '../controller/CandidaturaController.js';
import { requireAbility } from '../middlewares/requireAbility.js';

const router = express.Router();
const candidatoController = new CandidatoController();
const formacaoController = new FormacaoController();
const experienciaController = new ExperienciaController();
const habilidadeController = new HabilidadeController();
const certificacaoController = new CertificacaoController();
const candidaturaController = new CandidaturaController();

const aliasIdAsCandidatoId = (req, _res, next) => {
  req.params.candidatoId = req.params.id;
  return next();
};



router.post('/candidato', (req, res, next) => candidatoController.criar(req, res, next));

// CANDIDATO (próprio) e RECRUTADOR (leitura) podem listar candidatos
router.get('/candidato', requireAbility('read', 'Candidato'), (req, res, next) =>
  candidatoController.listar(req, res, next),
);

// Sub-rotas de leitura agrupadas (alias de :id → candidatoId)
router.get('/candidato/formacao/:id', requireAbility('read', 'Candidato'), aliasIdAsCandidatoId, (req, res, next) =>
  formacaoController.listarFormacao(req, res, next),
);
router.get('/candidato/experiencia/:id', requireAbility('read', 'Candidato'), aliasIdAsCandidatoId, (req, res, next) =>
  experienciaController.listarExperiencia(req, res, next),
);
router.get('/candidato/habilidade/:id', requireAbility('read', 'Candidato'), aliasIdAsCandidatoId, (req, res, next) =>
  habilidadeController.listarHabilidade(req, res, next),
);
router.get('/candidato/certificacao/:id', requireAbility('read', 'Candidato'), aliasIdAsCandidatoId, (req, res, next) =>
  certificacaoController.listarCertificacao(req, res, next),
);

router.get('/candidato/:id', requireAbility('read', 'Candidato'), (req, res, next) =>
  candidatoController.buscarPorId(req, res, next),
);

// Apenas CANDIDATO e ADMINISTRADOR podem atualizar/deletar um candidato
router.put('/candidato/:id', requireAbility('update', 'Candidato'), (req, res, next) =>
  candidatoController.atualizar(req, res, next),
);
router.delete('/candidato/:id', requireAbility('delete', 'Candidato'), (req, res, next) =>
  candidatoController.deletar(req, res, next),
);


// ─────────────────────────────────────────────────────────────────────────────
// Formação — apenas CANDIDATO e ADMINISTRADOR
// ─────────────────────────────────────────────────────────────────────────────
router.post('/candidato/:candidatoId/formacao', requireAbility('create', 'Candidato'), (req, res, next) =>
  formacaoController.criarFormacao(req, res, next),
);
router.get('/candidato/:candidatoId/formacao', requireAbility('read', 'Candidato'), (req, res, next) =>
  formacaoController.listarFormacao(req, res, next),
);
router.put('/candidato/:candidatoId/formacao/:id', requireAbility('update', 'Candidato'), (req, res, next) =>
  formacaoController.atualizarFormacao(req, res, next),
);
router.delete('/candidato/:candidatoId/formacao/:id', requireAbility('delete', 'Candidato'), (req, res, next) =>
  formacaoController.deletarFormacao(req, res, next),
);


// ─────────────────────────────────────────────────────────────────────────────
// Experiência — apenas CANDIDATO e ADMINISTRADOR
// ─────────────────────────────────────────────────────────────────────────────
router.post('/candidato/:candidatoId/experiencia', requireAbility('create', 'Candidato'), (req, res, next) =>
  experienciaController.criarExperiencia(req, res, next),
);
router.get('/candidato/:candidatoId/experiencia', requireAbility('read', 'Candidato'), (req, res, next) =>
  experienciaController.listarExperiencia(req, res, next),
);
router.put('/candidato/:candidatoId/experiencia/:id', requireAbility('update', 'Candidato'), (req, res, next) =>
  experienciaController.atualizarExperiencia(req, res, next),
);
router.delete('/candidato/:candidatoId/experiencia/:id', requireAbility('delete', 'Candidato'), (req, res, next) =>
  experienciaController.deletarExperiencia(req, res, next),
);


// ─────────────────────────────────────────────────────────────────────────────
// Habilidade — apenas CANDIDATO e ADMINISTRADOR
// ─────────────────────────────────────────────────────────────────────────────
router.post('/candidato/:candidatoId/habilidade', requireAbility('create', 'Candidato'), (req, res, next) =>
  habilidadeController.criarHabilidade(req, res, next),
);
router.get('/candidato/:candidatoId/habilidade', requireAbility('read', 'Candidato'), (req, res, next) =>
  habilidadeController.listarHabilidade(req, res, next),
);
router.put('/candidato/:candidatoId/habilidade/:id', requireAbility('update', 'Candidato'), (req, res, next) =>
  habilidadeController.atualizarHabilidade(req, res, next),
);
router.delete('/candidato/:candidatoId/habilidade/:id', requireAbility('delete', 'Candidato'), (req, res, next) =>
  habilidadeController.deletarHabilidade(req, res, next),
);


// ─────────────────────────────────────────────────────────────────────────────
// Certificação — apenas CANDIDATO e ADMINISTRADOR
// ─────────────────────────────────────────────────────────────────────────────
router.post('/candidato/:candidatoId/certificacao', requireAbility('create', 'Candidato'), (req, res, next) =>
  certificacaoController.criarCertificacao(req, res, next),
);
router.get('/candidato/:candidatoId/certificacao', requireAbility('read', 'Candidato'), (req, res, next) =>
  certificacaoController.listarCertificacao(req, res, next),
);
router.put('/candidato/:candidatoId/certificacao/:id', requireAbility('update', 'Candidato'), (req, res, next) =>
  certificacaoController.atualizarCertificacao(req, res, next),
);
router.delete('/candidato/:candidatoId/certificacao/:id', requireAbility('delete', 'Candidato'), (req, res, next) =>
  certificacaoController.deletarCertificacao(req, res, next),
);


// ─────────────────────────────────────────────────────────────────────────────
// Candidatura — apenas CANDIDATO e ADMINISTRADOR
// ─────────────────────────────────────────────────────────────────────────────
router.post('/candidato/:candidatoId/candidatura', requireAbility('create', 'Candidato'), (req, res, next) =>
  candidaturaController.criarCandidatura(req, res, next),
);
router.get('/candidato/:candidatoId/candidatura', requireAbility('read', 'Candidato'), (req, res, next) =>
  candidaturaController.listarCandidatura(req, res, next),
);
router.get('/candidato/:candidatoId/candidatura/:vagaId', requireAbility('read', 'Candidato'), (req, res, next) =>
  candidaturaController.detalharCandidatura(req, res, next),
);
router.patch(
  '/candidato/:candidatoId/candidatura/:vagaId/status',
  requireAbility('update', 'Candidato'),
  (req, res, next) => candidaturaController.atualizarStatusCandidatura(req, res, next),
);
router.delete('/candidato/:candidatoId/candidatura/:vagaId', requireAbility('delete', 'Candidato'), (req, res, next) =>
  candidaturaController.cancelarCandidatura(req, res, next),
);

export default router;

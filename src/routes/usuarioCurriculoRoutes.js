import express from 'express';
import FormacaoController from '../controller/FormacaoController.js';
import ExperienciaController from '../controller/ExperienciaController.js';
import HabilidadeController from '../controller/HabilidadeController.js';
import CertificacaoController from '../controller/CertificacaoController.js';
import CandidaturaController from '../controller/CandidaturaController.js';

const router = express.Router();
const formacaoController = new FormacaoController();
const experienciaController = new ExperienciaController();
const habilidadeController = new HabilidadeController();
const certificacaoController = new CertificacaoController();
const candidaturaController = new CandidaturaController();

// Formação
router.post('/usuarios/:id/formacao', (req, res, next) => formacaoController.criarFormacao(req, res, next));
router.get('/usuarios/:id/formacao', (req, res, next) => formacaoController.listarFormacao(req, res, next));
router.put('/usuarios/:id/formacao/:formacaoId', (req, res, next) => formacaoController.atualizarFormacao(req, res, next));
router.delete('/usuarios/:id/formacao/:formacaoId', (req, res, next) => formacaoController.deletarFormacao(req, res, next));

// Experiência
router.post('/usuarios/:id/experiencia', (req, res, next) => experienciaController.criarExperiencia(req, res, next));
router.get('/usuarios/:id/experiencia', (req, res, next) => experienciaController.listarExperiencia(req, res, next));
router.put('/usuarios/:id/experiencia/:experienciaId', (req, res, next) => experienciaController.atualizarExperiencia(req, res, next));
router.delete('/usuarios/:id/experiencia/:experienciaId', (req, res, next) => experienciaController.deletarExperiencia(req, res, next));

// Habilidade
router.post('/usuarios/:id/habilidade', (req, res, next) => habilidadeController.criarHabilidade(req, res, next));
router.get('/usuarios/:id/habilidade', (req, res, next) => habilidadeController.listarHabilidade(req, res, next));
router.put('/usuarios/:id/habilidade/:habilidadeId', (req, res, next) => habilidadeController.atualizarHabilidade(req, res, next));
router.delete('/usuarios/:id/habilidade/:habilidadeId', (req, res, next) => habilidadeController.deletarHabilidade(req, res, next));

// Certificação
router.post('/usuarios/:id/certificacao', (req, res, next) => certificacaoController.criarCertificacao(req, res, next));
router.get('/usuarios/:id/certificacao', (req, res, next) => certificacaoController.listarCertificacao(req, res, next));
router.put('/usuarios/:id/certificacao/:certificacaoId', (req, res, next) => certificacaoController.atualizarCertificacao(req, res, next));
router.delete('/usuarios/:id/certificacao/:certificacaoId', (req, res, next) => certificacaoController.deletarCertificacao(req, res, next));

// Candidatura
router.post('/usuarios/:id/candidatura', (req, res, next) => candidaturaController.criarCandidatura(req, res, next));
router.get('/usuarios/:id/candidatura', (req, res, next) => candidaturaController.listarCandidatura(req, res, next));
router.get('/usuarios/:id/candidatura/:vagaId', (req, res, next) => candidaturaController.detalharCandidatura(req, res, next));
router.patch('/usuarios/:id/candidatura/:vagaId/status', (req, res, next) => candidaturaController.atualizarStatusCandidatura(req, res, next));
router.delete('/usuarios/:id/candidatura/:vagaId', (req, res, next) => candidaturaController.cancelarCandidatura(req, res, next));

export default router;

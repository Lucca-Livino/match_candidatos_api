import express from 'express';
import CandidatoController from '../controller/CandidatoController.js';
import FormacaoController from '../controller/FormacaoController.js';
import ExperienciaController from '../controller/ExperienciaController.js';
import HabilidadeController from '../controller/HabilidadeController.js';
import CertificacaoController from '../controller/CertificacaoController.js';
import CandidaturaController from '../controller/CandidaturaController.js';


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


//Candidato
router.post('/candidato', (req, res, next) => candidatoController.criar(req, res, next));
router.get('/candidato', (req, res, next) => candidatoController.listar(req, res, next));
router.get('/candidato/formacao/:id', aliasIdAsCandidatoId, (req, res, next) => formacaoController.listarFormacao(req, res, next));
router.get('/candidato/experiencia/:id', aliasIdAsCandidatoId, (req, res, next) => experienciaController.listarExperiencia(req, res, next));
router.get('/candidato/habilidade/:id', aliasIdAsCandidatoId, (req, res, next) => habilidadeController.listarHabilidade(req, res, next));
router.get('/candidato/certificacao/:id', aliasIdAsCandidatoId, (req, res, next) => certificacaoController.listarCertificacao(req, res, next));

router.get('/candidato/:id', (req, res, next) => candidatoController.buscarPorId(req, res, next));
router.put('/candidato/:id', (req, res, next) => candidatoController.atualizar(req, res, next));
router.delete('/candidato/:id', (req, res, next) => candidatoController.deletar(req, res, next));

// Formação
router.post('/candidato/:candidatoId/formacao', (req, res, next) =>
  formacaoController.criarFormacao(req, res, next),
);
router.get('/candidato/:candidatoId/formacao', (req, res, next) =>
  formacaoController.listarFormacao(req, res, next),
);
router.put('/candidato/:candidatoId/formacao/:id', (req, res, next) =>
  formacaoController.atualizarFormacao(req, res, next),
);
router.delete('/candidato/:candidatoId/formacao/:id', (req, res, next) =>
  formacaoController.deletarFormacao(req, res, next),
);

// Experiência
router.post('/candidato/:candidatoId/experiencia', (req, res, next) =>
  experienciaController.criarExperiencia(req, res, next),
);
router.get('/candidato/:candidatoId/experiencia', (req, res, next) =>
  experienciaController.listarExperiencia(req, res, next),
);
router.put('/candidato/:candidatoId/experiencia/:id', (req, res, next) =>
  experienciaController.atualizarExperiencia(req, res, next),
);
router.delete('/candidato/:candidatoId/experiencia/:id', (req, res, next) =>
  experienciaController.deletarExperiencia(req, res, next),
);

// Habilidade
router.post('/candidato/:candidatoId/habilidade', (req, res, next) =>
  habilidadeController.criarHabilidade(req, res, next),
);
router.get('/candidato/:candidatoId/habilidade', (req, res, next) =>
  habilidadeController.listarHabilidade(req, res, next),
);
router.put('/candidato/:candidatoId/habilidade/:id', (req, res, next) =>
  habilidadeController.atualizarHabilidade(req, res, next),
);
router.delete('/candidato/:candidatoId/habilidade/:id', (req, res, next) =>
  habilidadeController.deletarHabilidade(req, res, next),
);

// Certificação
router.post('/candidato/:candidatoId/certificacao', (req, res, next) =>
  certificacaoController.criarCertificacao(req, res, next),
);
router.get('/candidato/:candidatoId/certificacao', (req, res, next) =>
  certificacaoController.listarCertificacao(req, res, next),
);
router.put('/candidato/:candidatoId/certificacao/:id', (req, res, next) =>
  certificacaoController.atualizarCertificacao(req, res, next),
);
router.delete('/candidato/:candidatoId/certificacao/:id', (req, res, next) =>
  certificacaoController.deletarCertificacao(req, res, next),
);

// Candidatura
router.post('/candidato/:candidatoId/candidatura', (req, res, next) =>
  candidaturaController.criarCandidatura(req, res, next),
);
router.get('/candidato/:candidatoId/candidatura', (req, res, next) =>
  candidaturaController.listarCandidatura(req, res, next),
);
router.get('/candidato/:candidatoId/candidatura/:vagaId', (req, res, next) =>
  candidaturaController.detalharCandidatura(req, res, next),
);
router.patch('/candidato/:candidatoId/candidatura/:vagaId/status', (req, res, next) =>
  candidaturaController.atualizarStatusCandidatura(req, res, next),
);
router.delete('/candidato/:candidatoId/candidatura/:vagaId', (req, res, next) =>
  candidaturaController.cancelarCandidatura(req, res, next),
);

export default router;

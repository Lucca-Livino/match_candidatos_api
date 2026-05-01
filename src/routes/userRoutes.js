import express from 'express';
import UsuarioController from '../controller/UsuarioController.js';
import { requireAbility } from '../middlewares/requireAbility.js';

const router = express.Router();
const usuarioController = new UsuarioController();

// Todas as rotas de usuário são restritas a ADMINISTRADOR (manage Usuario)
router.get('/usuarios', requireAbility('read', 'Usuario'), (req, res, next) => {
  usuarioController.listar(req, res).catch(next);
});

router.get('/usuarios/:id', requireAbility('read', 'Usuario'), (req, res, next) => {
  usuarioController.listarPorId(req, res).catch(next);
});

router.post('/usuarios', requireAbility('create', 'Usuario'), (req, res, next) => {
  usuarioController.criar(req, res).catch(next);
});

router.patch('/usuarios/:id', requireAbility('update', 'Usuario'), (req, res, next) => {
  usuarioController.atualizar(req, res).catch(next);
});

router.delete('/usuarios/:id', requireAbility('delete', 'Usuario'), (req, res, next) => {
  usuarioController.deletar(req, res).catch(next);
});

export default router;

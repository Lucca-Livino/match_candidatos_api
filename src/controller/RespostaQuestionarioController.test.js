import RespostaQuestionarioController from './RespostaQuestionarioController.js';
import RespostaQuestionarioService from '../service/RespostaQuestionarioService.js';
import {
  validateIniciarRespostaQuestionario,
  validateResponderQuestionario,
} from '../utils/validators/respostaQuestionarioValidators.js';
import { conduzProcesso } from '../utils/helpers/papeis.js';

jest.mock('../service/RespostaQuestionarioService.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ servicoPadrao: 'resposta' })),
}));
jest.mock('../utils/validators/respostaQuestionarioValidators.js', () => ({
  __esModule: true,
  validateIniciarRespostaQuestionario: jest.fn((body) => ({ validado: body })),
  validateResponderQuestionario: jest.fn((body) => ({ validado: body })),
}));
jest.mock('../utils/helpers/papeis.js', () => ({ __esModule: true, conduzProcesso: jest.fn() }));

const DADOS = { ok: true };
const SOLICITANTE = { id: 'u1', tipos_permissao: ['candidato'] };

const montar = () => {
  const service = {
    iniciar: jest.fn().mockResolvedValue(DADOS),
    responder: jest.fn().mockResolvedValue(DADOS),
    finalizar: jest.fn().mockResolvedValue(DADOS),
    buscarCompleta: jest.fn().mockResolvedValue(DADOS),
  };
  const controller = new RespostaQuestionarioController(service);
  const req = { params: { id: 'r1' }, body: { campo: 1 }, user_id: 'u1', user: { tipos_permissao: ['candidato'] } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { controller, service, req, res, next };
};

const esperarSucesso = (res, status, message) => {
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledWith({ success: true, message, data: DADOS });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RespostaQuestionarioController', () => {
  it('usa o serviço padrão quando nada é injetado', () => {
    const controller = new RespostaQuestionarioController();

    expect(RespostaQuestionarioService).toHaveBeenCalledTimes(1);
    expect(controller.service).toEqual({ servicoPadrao: 'resposta' });
  });

  it('iniciar valida o corpo e repassa o solicitante', async () => {
    const { controller, service, req, res, next } = montar();

    await controller.iniciar(req, res, next);

    expect(validateIniciarRespostaQuestionario).toHaveBeenCalledWith({ campo: 1 });
    expect(service.iniciar).toHaveBeenCalledWith({ validado: { campo: 1 } }, SOLICITANTE);
    esperarSucesso(res, 201, 'Resposta de questionário iniciada com sucesso.');
  });

  it('responder valida o corpo e repassa id e solicitante', async () => {
    const { controller, service, req, res, next } = montar();

    await controller.responder(req, res, next);

    expect(validateResponderQuestionario).toHaveBeenCalledWith({ campo: 1 });
    expect(service.responder).toHaveBeenCalledWith('r1', { validado: { campo: 1 } }, SOLICITANTE);
    esperarSucesso(res, 200, 'Respostas registradas com sucesso.');
  });

  it('finalizar repassa id e solicitante sem papéis quando não há usuário na requisição', async () => {
    const { controller, service, req, res, next } = montar();
    delete req.user;

    await controller.finalizar(req, res, next);

    expect(service.finalizar).toHaveBeenCalledWith('r1', { id: 'u1', tipos_permissao: [] });
    esperarSucesso(res, 200, 'Questionário finalizado com sucesso.');
  });

  it('finalizar trata usuário sem tipos de permissão como lista vazia', async () => {
    const { controller, service, req, res, next } = montar();
    req.user = {};

    await controller.finalizar(req, res, next);

    expect(service.finalizar).toHaveBeenCalledWith('r1', { id: 'u1', tipos_permissao: [] });
  });

  it.each([true, false])('buscarPorId pede gabarito = %s conforme quem conduz o processo', async (conduz) => {
    const { controller, service, req, res, next } = montar();
    conduzProcesso.mockReturnValue(conduz);

    await controller.buscarPorId(req, res, next);

    expect(conduzProcesso).toHaveBeenCalledWith(req);
    expect(service.buscarCompleta).toHaveBeenCalledWith('r1', SOLICITANTE, { comGabarito: conduz });
    esperarSucesso(res, 200, 'Resposta de questionário encontrada com sucesso.');
  });

  it.each(['iniciar', 'responder', 'finalizar'])('%s repassa ao next o erro do serviço', async (acao) => {
    const { controller, service, req, res, next } = montar();
    const erro = new Error('falhou');
    service[acao].mockRejectedValue(erro);

    await controller[acao](req, res, next);

    expect(next).toHaveBeenCalledWith(erro);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('buscarPorId repassa ao next o erro do serviço', async () => {
    const { controller, service, req, res, next } = montar();
    const erro = new Error('falhou');
    service.buscarCompleta.mockRejectedValue(erro);

    await controller.buscarPorId(req, res, next);

    expect(next).toHaveBeenCalledWith(erro);
  });
});

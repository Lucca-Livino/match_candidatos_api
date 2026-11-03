import CandidaturaController from './CandidaturaController.js';
import CandidaturaService from '../service/CandidaturaService.js';
import FichaCandidaturaService from '../service/FichaCandidaturaService.js';
import {
  validateCreateCandidatura,
  validateUpdateStatusCandidatura,
} from '../utils/validators/candidaturaValidators.js';

jest.mock('../service/CandidaturaService.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ servicoPadrao: 'candidatura' })),
}));
jest.mock('../service/FichaCandidaturaService.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({ servicoPadrao: 'ficha' })),
}));
jest.mock('../utils/validators/candidaturaValidators.js', () => ({
  __esModule: true,
  validateCreateCandidatura: jest.fn((body) => ({ validado: body })),
  validateUpdateStatusCandidatura: jest.fn((body) => ({ validado: body })),
}));

const DADOS = { ok: true };

const montar = () => {
  const service = {
    criarCandidatura: jest.fn().mockResolvedValue(DADOS),
    listarCandidatura: jest.fn().mockResolvedValue(DADOS),
    detalharCandidatura: jest.fn().mockResolvedValue(DADOS),
    atualizarStatusCandidatura: jest.fn().mockResolvedValue(DADOS),
    listarPorVaga: jest.fn().mockResolvedValue(DADOS),
    listarParaAuditoria: jest.fn().mockResolvedValue(DADOS),
    reavaliarCandidatura: jest.fn().mockResolvedValue(DADOS),
    cancelarCandidatura: jest.fn().mockResolvedValue(DADOS),
  };
  const fichaService = { montar: jest.fn().mockResolvedValue(DADOS) };
  const controller = new CandidaturaController(service, fichaService);
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { controller, service, fichaService, res, next };
};

const esperarSucesso = (res, status, message) => {
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    message,
    data: DADOS,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CandidaturaController', () => {
  it('usa os serviços padrão quando nada é injetado', () => {
    const controller = new CandidaturaController();

    expect(CandidaturaService).toHaveBeenCalledTimes(1);
    expect(FichaCandidaturaService).toHaveBeenCalledTimes(1);
    expect(controller.service).toEqual({ servicoPadrao: 'candidatura' });
    expect(controller.fichaService).toEqual({ servicoPadrao: 'ficha' });
  });

  it.each([
    [
      'criarCandidatura',
      { params: { id: 'u1' }, body: { vagaId: 'v1' } },
      ['u1', { validado: { vagaId: 'v1' } }],
      201,
      'Candidatura criada com sucesso.',
    ],
    ['listarCandidatura', { params: { id: 'u1' } }, ['u1'], 200, 'Candidaturas listadas com sucesso.'],
    [
      'detalharCandidatura',
      { params: { id: 'u1', vagaId: 'v1' } },
      ['u1', 'v1'],
      200,
      'Candidatura detalhada com sucesso.',
    ],
    ['listarPorVaga', { params: { id: 'v1' } }, ['v1'], 200, 'Candidaturas da vaga listadas com sucesso.'],
    [
      'reavaliarCandidatura',
      { params: { usuarioId: 'u1', id: 'v1' } },
      ['u1', 'v1'],
      200,
      'Candidatura reavaliada com sucesso.',
    ],
    [
      'cancelarCandidatura',
      { params: { id: 'u1', vagaId: 'v1' } },
      ['u1', 'v1'],
      200,
      'Candidatura cancelada com sucesso.',
    ],
  ])('%s repassa os parâmetros ao serviço e responde sucesso', async (acao, req, args, status, message) => {
    const { controller, service, res, next } = montar();

    await controller[acao](req, res, next);

    expect(service[acao]).toHaveBeenCalledWith(...args);
    esperarSucesso(res, status, message);
    expect(next).not.toHaveBeenCalled();
  });

  it('criarCandidatura valida o corpo antes de chamar o serviço', async () => {
    const { controller, res, next } = montar();

    await controller.criarCandidatura({ params: { id: 'u1' }, body: { vagaId: 'v1' } }, res, next);

    expect(validateCreateCandidatura).toHaveBeenCalledWith({ vagaId: 'v1' });
  });

  it('montarFicha usa o serviço da ficha com usuário e vaga da rota', async () => {
    const { controller, fichaService, res, next } = montar();

    await controller.montarFicha({ params: { usuarioId: 'u1', id: 'v1' } }, res, next);

    expect(fichaService.montar).toHaveBeenCalledWith('u1', 'v1');
    esperarSucesso(res, 200, 'Ficha da candidatura montada com sucesso.');
  });

  describe('atualizarStatusCandidatura', () => {
    it.each([
      ['o e-mail do usuário', { user: { email: 'rh@x.com' }, user_id: 'id1' }, 'rh@x.com'],
      ['o id do usuário sem e-mail', { user: {}, user_id: 42 }, '42'],
      ['o id do usuário sem objeto user', { user_id: 'id1' }, 'id1'],
      ['nulo sem usuário identificado', {}, null],
    ])('registra como responsável %s', async (_caso, identidade, responsavel) => {
      const { controller, service, res, next } = montar();
      const req = {
        params: { id: 'u1', vagaId: 'v1' },
        body: { status: 'aprovado' },
        ...identidade,
      };

      await controller.atualizarStatusCandidatura(req, res, next);

      expect(validateUpdateStatusCandidatura).toHaveBeenCalledWith({
        status: 'aprovado',
      });
      expect(service.atualizarStatusCandidatura).toHaveBeenCalledWith(
        'u1',
        'v1',
        { validado: { status: 'aprovado' } },
        responsavel,
      );
      esperarSucesso(res, 200, 'Status da candidatura atualizado com sucesso.');
    });
  });

  describe('listarParaAuditoria', () => {
    it.each([
      ['pendentes e vaga informados', { pendentes: 'true', vagaId: 'v1' }, { apenasPendentes: true, vagaId: 'v1' }],
      ['filtros ausentes', {}, { apenasPendentes: false, vagaId: null }],
      ['pendentes diferente de "true"', { pendentes: '1', vagaId: '' }, { apenasPendentes: false, vagaId: null }],
    ])('converte a query com %s', async (_caso, query, filtros) => {
      const { controller, service, res, next } = montar();

      await controller.listarParaAuditoria({ query }, res, next);

      expect(service.listarParaAuditoria).toHaveBeenCalledWith(filtros);
      esperarSucesso(res, 200, 'Avaliações listadas com sucesso.');
    });
  });

  it.each([
    ['criarCandidatura', { params: {}, body: {} }],
    ['listarCandidatura', { params: {} }],
    ['detalharCandidatura', { params: {} }],
    ['atualizarStatusCandidatura', { params: {}, body: {} }],
    ['listarPorVaga', { params: {} }],
    ['listarParaAuditoria', { query: {} }],
    ['reavaliarCandidatura', { params: {} }],
    ['cancelarCandidatura', { params: {} }],
  ])('%s repassa ao next o erro do serviço', async (acao, req) => {
    const { controller, service, res, next } = montar();
    const erro = new Error('falhou');
    service[acao].mockRejectedValue(erro);

    await controller[acao](req, res, next);

    expect(next).toHaveBeenCalledWith(erro);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('montarFicha repassa ao next o erro do serviço da ficha', async () => {
    const { controller, fichaService, res, next } = montar();
    const erro = new Error('falhou');
    fichaService.montar.mockRejectedValue(erro);

    await controller.montarFicha({ params: {} }, res, next);

    expect(next).toHaveBeenCalledWith(erro);
  });

  it('repassa ao next o erro de validação sem chamar o serviço', async () => {
    const { controller, service, res, next } = montar();
    const erro = new Error('inválido');
    validateCreateCandidatura.mockImplementationOnce(() => {
      throw erro;
    });

    await controller.criarCandidatura({ params: { id: 'u1' }, body: {} }, res, next);

    expect(next).toHaveBeenCalledWith(erro);
    expect(service.criarCandidatura).not.toHaveBeenCalled();
  });
});

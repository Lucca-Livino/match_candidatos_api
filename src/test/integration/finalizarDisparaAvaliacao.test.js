import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import RespostaQuestionarioService from '../../service/RespostaQuestionarioService.js';
import Questionario from '../../models/Questionario.js';
import Candidatura from '../../models/Candidatura.js';
import RespostaQuestionario from '../../models/RespostaQuestionario.js';

describe('RespostaQuestionarioService.finalizar — disparo da avaliacao', () => {
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  const montarCenario = async () => {
    const questionario = await Questionario.create({
      vagaId: 'vaga-1',
      criadoPor: 'recrutador-1',
      titulo: 'Triagem inicial',
      ativo: 1,
    });
    await Candidatura.create({ usuarioId: 'user-1', vagaId: 'vaga-1' });
    const resposta = await RespostaQuestionario.create({
      questionarioId: questionario.id,
      usuarioId: 'user-1',
      status: 'em_andamento',
    });
    return { questionario, resposta };
  };

  const montarService = (avaliacaoService) =>
    new RespostaQuestionarioService(undefined, undefined, undefined, undefined, avaliacaoService);

  it('chama a avaliacao com usuarioId e vagaId da vaga do questionario', async () => {
    const { resposta } = await montarCenario();
    const avaliacaoService = { avaliar: jest.fn().mockResolvedValue(null) };
    const service = montarService(avaliacaoService);

    await service.finalizar(resposta.id);
    await service.avaliacaoEmAndamento;

    expect(avaliacaoService.avaliar).toHaveBeenCalledWith('user-1', 'vaga-1');
  });

  it('nao espera a IA para responder', async () => {
    // O ponto do fire-and-forget: `finalizar` resolve antes da avaliacao.
    // Com `await` no disparo, esta assercao falha — que e o objetivo dela.
    const { resposta } = await montarCenario();
    let avaliacaoTerminou = false;
    let liberar;
    const bloqueio = new Promise((resolve) => {
      liberar = resolve;
    });
    const avaliacaoService = {
      avaliar: jest.fn().mockImplementation(async () => {
        await bloqueio;
        avaliacaoTerminou = true;
        return null;
      }),
    };
    const service = montarService(avaliacaoService);

    const finalizada = await service.finalizar(resposta.id);

    expect(finalizada.status).toBe('finalizado');
    expect(avaliacaoTerminou).toBe(false);

    liberar();
    await service.avaliacaoEmAndamento;
    expect(avaliacaoTerminou).toBe(true);
  });

  it('finaliza normalmente mesmo se a avaliacao rejeitar', async () => {
    // A triagem e um acessorio do fluxo, nao um pre-requisito dele: uma falha
    // na IA nao pode impedir o candidato de concluir o questionario.
    const { resposta } = await montarCenario();
    const avaliacaoService = { avaliar: jest.fn().mockRejectedValue(new Error('down')) };
    const erro = jest.spyOn(console, 'error').mockImplementation(() => {});
    const service = montarService(avaliacaoService);

    const finalizada = await service.finalizar(resposta.id);
    await service.avaliacaoEmAndamento;

    expect(finalizada.status).toBe('finalizado');
    expect(erro).toHaveBeenCalled();
    erro.mockRestore();
  });

  it('persiste a finalizacao antes de chamar a IA', async () => {
    // A ordem e o que torna a falha acima recuperavel: se a IA fosse chamada
    // antes da escrita, uma queda no meio deixaria a resposta em_andamento e
    // o candidato preso na tela do questionario.
    const { resposta } = await montarCenario();
    const avaliacaoService = {
      avaliar: jest.fn().mockImplementation(async () => {
        const doc = await RespostaQuestionario.findOne({ id: resposta.id }).lean();
        expect(doc.status).toBe('finalizado');
        return null;
      }),
    };

    const service = montarService(avaliacaoService);

    await service.finalizar(resposta.id);
    await service.avaliacaoEmAndamento;

    expect(avaliacaoService.avaliar).toHaveBeenCalled();
  });

  it('nao dispara a avaliacao quando a resposta ja foi finalizada', async () => {
    const { resposta } = await montarCenario();
    await RespostaQuestionario.updateOne({ id: resposta.id }, { status: 'finalizado' });
    const avaliacaoService = { avaliar: jest.fn() };

    await expect(montarService(avaliacaoService).finalizar(resposta.id)).rejects.toThrow(
      'A resposta ja foi finalizada.',
    );
    expect(avaliacaoService.avaliar).not.toHaveBeenCalled();
  });
});

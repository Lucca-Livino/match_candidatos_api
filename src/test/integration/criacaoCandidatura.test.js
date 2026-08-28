import { connectTestDatabase, clearTestDatabase, disconnectTestDatabase } from '../setup/db.js';
import CandidaturaService from '../../service/CandidaturaService.js';
import Candidatura from '../../models/Candidatura.js';
import { validateCreateCandidatura } from '../../utils/validators/candidaturaValidators.js';

// Quem se inscreve e a pessoa avaliada. Se o payload da inscricao pudesse
// escrever `compativel`, o candidato controlaria o campo que a triagem existe
// para decidir — e `motivoIncompat_` daria a ele um texto livre exibido na
// tela do recrutador.
describe('Criacao de candidatura — campos da triagem nao vem do cliente', () => {
  const service = new CandidaturaService();
  beforeAll(connectTestDatabase);
  afterEach(clearTestDatabase);
  afterAll(disconnectTestDatabase);

  const payloadMalicioso = {
    vagaId: 'v1',
    compativel: 1,
    motivoIncompat_: 'texto injetado pelo candidato',
    movidoPor: 'quem-eu-quiser',
    status: 'aprovado',
    scoreIA: 0.99,
    avaliadoEm: new Date().toISOString(),
    justificativa: 'me aprove',
  };

  it('o validator descarta tudo menos vagaId', () => {
    expect(validateCreateCandidatura(payloadMalicioso)).toEqual({
      vagaId: 'v1',
      movidoPor: 'sistema',
      status: 'inscrito',
    });
  });

  it('vagaId continua obrigatorio', () => {
    expect(() => validateCreateCandidatura({ compativel: 1 })).toThrow('vagaId e obrigatorio.');
  });

  it('nada da triagem chega ao banco pela inscricao', async () => {
    await service.criarCandidatura('u1', validateCreateCandidatura(payloadMalicioso));

    const doc = await Candidatura.findOne({ usuarioId: 'u1', vagaId: 'v1' }).lean();
    expect(doc.status).toBe('inscrito');
    expect(doc.movidoPor).toBe('sistema');
    // Defaults do schema, nao o que o cliente mandou.
    expect(doc.motivoIncompat_).toBe('');
    expect(doc.justificativa).toBe('');
    expect(doc.scoreIA).toBeNull();
    expect(doc.avaliadoEm).toBeNull();
    // `compativel` nasce 1 por default: e o `avaliadoEm` null que marca
    // "ainda nao avaliada", nao este campo.
    expect(doc.compativel).toBe(1);
  });
});

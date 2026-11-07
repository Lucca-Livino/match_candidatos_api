import mongoose from 'mongoose';
import ExclusaoContaRepository from '../../../repository/ExclusaoContaRepository.js';
import Formacao from '../../../models/Formacao.js';
import Experiencia from '../../../models/Experiencia.js';
import Habilidade from '../../../models/Habilidade.js';
import Certificacao from '../../../models/Certificacao.js';

const OBJECT_ID = '64b7f0c2a1b2c3d4e5f60718';

const conexaoCom = (porColecao) => {
  const colecoes = {};
  const collection = jest.fn((nome) => {
    colecoes[nome] ??= { deleteMany: jest.fn().mockResolvedValue(porColecao[nome]) };
    return colecoes[nome];
  });
  return { db: { collection }, colecoes };
};

describe('ExclusaoContaRepository', () => {
  afterEach(() => jest.restoreAllMocks());

  it('usa a conexão padrão do mongoose quando nenhuma é injetada', () => {
    expect(new ExclusaoContaRepository().connection).toBe(mongoose.connection);
  });

  describe('removerCurriculo', () => {
    it('apaga os quatro modelos do currículo pelo id em texto e soma o que foi removido', async () => {
      const modelos = [Formacao, Experiencia, Habilidade, Certificacao];
      const resultados = [{ deletedCount: 2 }, { deletedCount: 1 }, {}, null];
      modelos.forEach((m, i) => jest.spyOn(m, 'deleteMany').mockResolvedValue(resultados[i]));

      await expect(new ExclusaoContaRepository({}).removerCurriculo(42)).resolves.toBe(3);
      modelos.forEach((m) => expect(m.deleteMany).toHaveBeenCalledWith({ usuarioId: '42' }));
    });
  });

  describe('revogarSessoes', () => {
    it('id válido de ObjectId casa como texto e como ObjectId', async () => {
      const conexao = conexaoCom({ session: { deletedCount: 2 } });

      await expect(new ExclusaoContaRepository(conexao).revogarSessoes(OBJECT_ID)).resolves.toBe(2);
      expect(conexao.db.collection).toHaveBeenCalledWith('session');
      expect(conexao.colecoes.session.deleteMany).toHaveBeenCalledWith({
        userId: { $in: [OBJECT_ID, new mongoose.Types.ObjectId(OBJECT_ID)] },
      });
    });

    it.each([
      ['sem deletedCount', {}],
      ['resultado nulo', null],
    ])('id que não é ObjectId casa só como texto e %s conta zero', async (_, resultado) => {
      const conexao = conexaoCom({ session: resultado });

      await expect(new ExclusaoContaRepository(conexao).revogarSessoes('abc')).resolves.toBe(0);
      expect(conexao.colecoes.session.deleteMany).toHaveBeenCalledWith({ userId: { $in: ['abc'] } });
    });
  });

  describe('revogarAcesso', () => {
    it('apaga sessões e credenciais com o mesmo filtro e devolve as contagens', async () => {
      const conexao = conexaoCom({ session: { deletedCount: 1 }, account: { deletedCount: 3 } });

      await expect(new ExclusaoContaRepository(conexao).revogarAcesso('abc')).resolves.toEqual({
        sessoesRevogadas: 1,
        credenciaisRemovidas: 3,
      });
      expect(conexao.colecoes.session.deleteMany).toHaveBeenCalledWith({ userId: { $in: ['abc'] } });
      expect(conexao.colecoes.account.deleteMany).toHaveBeenCalledWith({ userId: { $in: ['abc'] } });
    });

    it('resultados sem contagem viram zero', async () => {
      const conexao = conexaoCom({ session: null, account: {} });

      await expect(new ExclusaoContaRepository(conexao).revogarAcesso('abc')).resolves.toEqual({
        sessoesRevogadas: 0,
        credenciaisRemovidas: 0,
      });
    });
  });

  describe('apagarTokensConvite', () => {
    it('apaga só tokens de reset-password do usuário', async () => {
      const conexao = conexaoCom({ verification: { deletedCount: 1 } });

      await expect(new ExclusaoContaRepository(conexao).apagarTokensConvite(7)).resolves.toBe(1);
      expect(conexao.db.collection).toHaveBeenCalledWith('verification');
      expect(conexao.colecoes.verification.deleteMany).toHaveBeenCalledWith({
        value: '7',
        identifier: /^reset-password:/,
      });
    });

    it('resultado nulo conta zero', async () => {
      const conexao = conexaoCom({ verification: null });

      await expect(new ExclusaoContaRepository(conexao).apagarTokensConvite('u1')).resolves.toBe(0);
    });
  });
});

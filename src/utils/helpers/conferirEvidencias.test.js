import { conferirEvidencias } from './conferirEvidencias.js';

const curriculo = {
  habilidades: [{ habilidade: 'Node.js', nivel: 'avancado' }],
  experiencias: [{ cargo: 'Desenvolvedora Back-end', empresa: 'Empresa X', descricaoAtivida_: 'APIs REST em Node.js com PostgreSQL.' }],
};
const questionario = {
  respostas: [
    { enunciado: 'Qual banco você usa?', textoResposta: '', opcoesSelecionadas: ['PostgreSQL'], gabarito: ['PostgreSQL'], acertou: true },
  ],
};
const criterio = (aderencia, evidencia) => ({ criterioId: 'c1', aderencia, evidencia, atendido: true });

describe('conferirEvidencias', () => {
  it('aceita evidência parafraseada com palavras do material', () => {
    expect(conferirEvidencias(curriculo, questionario, [criterio(0.9, 'Constrói APIs REST em Node.js')])).toEqual([]);
  });

  it('aceita evidência que cita acerto de múltipla escolha', () => {
    expect(conferirEvidencias(curriculo, questionario, [criterio(0.8, 'Acertou a pergunta sobre PostgreSQL')])).toEqual([]);
  });

  it('sinaliza nota alta com evidência que não está no material', () => {
    expect(conferirEvidencias(curriculo, questionario, [criterio(1, 'Lidera times de Kubernetes e Terraform na AWS')])).toEqual([
      { criterioId: 'c1', evidencia: 'Lidera times de Kubernetes e Terraform na AWS' },
    ]);
  });

  it('ignora nota baixa, "sem evidência" e evidência vazia', () => {
    expect(
      conferirEvidencias(curriculo, questionario, [
        criterio(0.4, 'Lidera times de Kubernetes'),
        criterio(1, 'Sem evidência no material.'),
        criterio(1, ''),
      ]),
    ).toEqual([]);
  });

  it('aceita material ausente sem quebrar', () => {
    expect(conferirEvidencias(undefined, undefined, [criterio(1, 'Kubernetes avançado')])).toHaveLength(1);
    expect(conferirEvidencias(curriculo, questionario, undefined)).toEqual([]);
  });

  it('converte criterioId para string e corta evidência em 300 caracteres', () => {
    const [achado] = conferirEvidencias({}, {}, [{ criterioId: 7, aderencia: 1, evidencia: `Kubernetes ${'x'.repeat(400)}` }]);
    expect(achado.criterioId).toBe('7');
    expect(achado.evidencia).toHaveLength(300);
  });
});

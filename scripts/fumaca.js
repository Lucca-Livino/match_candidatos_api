// Teste de fumaca do Step 13 da Task 10: chama CADA degrau da cascata uma vez
// com um payload ficticio e imprime o que voltou. E o unico ponto do fluxo que
// toca a rede — os testes de Jest injetam um provedor falso de proposito.
//
// Rodar com a chave no ambiente:
//   GEMINI_API_KEY=... node scripts/fumaca.js
//
// Duas coisas que so aparecem aqui:
//   1. ID de modelo invalido vira 404, classificado como `desistir`. Se um
//      degrau der 404, o problema e o ID na configuracao — nao a cota.
//   2. O formato do erro 429 REAL. Para conferir as sondas do
//      `classificarErroIA`, rode em laco apertado ate quebrar e imprima
//      `Object.getOwnPropertyNames(erro)`.
import 'dotenv/config';
import GeminiProvider from '../src/service/match/GeminiProvider.js';
import { classificarErroIA } from '../src/utils/helpers/classificarErroIA.js';

const CASCATA = process.env.CASCATA_FUMACA
  ? process.env.CASCATA_FUMACA.split(',').map((m) => m.trim())
  : ['gemini-3.1-flash-lite', 'gemini-3.1-flash'];

const payload = {
  vaga: {
    titulo: 'Pessoa Desenvolvedora Front-end',
    area: 'TI',
    descricao: 'Construir e manter as interfaces do produto.',
    requisitos_gerais: 'Trabalho remoto, time pequeno.',
    criterios: [
      {
        id: 'crit-1',
        nome: 'React',
        tipo_criterio: 'skill_tecnica',
        peso_percentual: 60,
        obrigatorio: true,
        descricao: 'Experiencia construindo componentes.',
      },
      {
        id: 'crit-2',
        nome: 'Ensino superior em computacao',
        tipo_criterio: 'formacao',
        peso_percentual: 40,
        obrigatorio: false,
        descricao: '',
      },
    ],
  },
  curriculo: {
    habilidades: [{ habilidade: 'React', nivel: 'avancado' }],
    formacoes: [{ curso: 'Sistemas de Informacao', grau: 'bacharelado', instituicao: 'IFRO' }],
    experiencias: [
      {
        cargo: 'Desenvolvedor Front-end Junior',
        empresa: 'Acme',
        descricaoAtivida_: 'Componentes React e migracao de build.',
      },
    ],
    certificacoes: [],
  },
  questionario: {
    titulo: 'Triagem inicial',
    respostas: [
      {
        perguntaId: 'p-1',
        enunciado: 'Descreva um desafio tecnico recente.',
        tipoResposta: 'dissertativa',
        textoResposta: 'Migrei o build do projeto de Webpack para Vite e cortei o tempo pela metade.',
        opcoesSelecionadas: [],
      },
    ],
  },
};

const provider = new GeminiProvider();

for (const modelo of CASCATA) {
  const inicio = Date.now();
  try {
    const resultado = await provider.gerarAvaliacao(payload, { modelo, temperatura: 0 });
    console.log(`\n=== ${modelo} — OK em ${Date.now() - inicio} ms ===`);
    console.log(JSON.stringify(resultado, null, 2));
  } catch (error) {
    console.log(`\n=== ${modelo} — FALHOU em ${Date.now() - inicio} ms ===`);
    console.log('classificacao:', classificarErroIA(error));
    console.log('campos do erro:', Object.getOwnPropertyNames(error));
    console.log(error);
  }
}

import { subirAmbiente, derrubarAmbiente } from './setup/ambiente.js';
import { criarUsuarioLogado } from './setup/usuarios.js';

// Segunda camada: com sessao valida, cada papel so alcanca o que a
// politicaAcesso libera. A matriz e escrita a mao, e nao derivada de
// config/politicasAcesso.js, de proposito: derivar faria o teste concordar
// com qualquer erro que entrasse na politica.
//
// "Permitido" aqui e "passou do RBAC": o handler pode responder 400 ou 404
// (ids ficticios, corpo vazio), mas nunca 401 ou 403.
const A = 'administrador';
const R = 'recrutador';
const C = 'candidato';
const S = 'suporte';
const PAPEIS = [A, R, C, S];

const ID = '000000000000000000000000';
const OUTRO = '111111111111111111111111';

const MATRIZ = [
  // Catalogo
  ['get', '/catalogo', [A, R, C, S]],
  ['post', '/catalogo', [A]],
  ['patch', `/catalogo/${ID}`, [A]],
  // Integracao e auditoria da triagem: so o suporte
  ['get', '/configuracao-integracao', [S]],
  ['patch', '/configuracao-integracao', [S]],
  ['get', '/avaliacoes', [S]],
  // Usuarios (de outra pessoa)
  ['get', '/usuarios', [A, R]],
  ['post', '/usuarios', [A]],
  ['get', `/usuarios/${OUTRO}`, [A]],
  ['patch', `/usuarios/${OUTRO}`, [A]],
  ['delete', `/usuarios/${OUTRO}`, [A]],
  ['post', '/usuarios/convite', [A]],
  ['post', `/usuarios/${OUTRO}/reenviar-convite`, [A]],
  ['patch', `/usuarios/${OUTRO}/status`, [A]],
  // Curriculo de outra pessoa: recrutador le, so admin escreve
  ['get', `/usuarios/${OUTRO}/formacao`, [A, R]],
  ['get', `/usuarios/${OUTRO}/experiencia`, [A, R]],
  ['get', `/usuarios/${OUTRO}/habilidade`, [A, R]],
  ['get', `/usuarios/${OUTRO}/certificacao`, [A, R]],
  ['post', `/usuarios/${OUTRO}/habilidade`, [A]],
  ['put', `/usuarios/${OUTRO}/formacao/${ID}`, [A]],
  ['delete', `/usuarios/${OUTRO}/certificacao/${ID}`, [A]],
  // Candidaturas de outra pessoa
  ['get', `/usuarios/${OUTRO}/candidatura`, [A]],
  ['post', `/usuarios/${OUTRO}/candidatura`, [A]],
  ['delete', `/usuarios/${OUTRO}/candidatura/${ID}`, [A]],
  ['patch', `/usuarios/${OUTRO}/candidatura/${ID}/status`, [A, R]],
  // Vagas
  ['get', '/vagas', [A, R, C]],
  ['get', `/vagas/${ID}`, [A, R, C]],
  ['post', '/vagas', [A, R]],
  ['patch', `/vagas/${ID}`, [A, R]],
  ['delete', `/vagas/${ID}`, [A, R]],
  ['get', '/vagas/relatorio', [A, R]],
  ['get', `/vagas/${ID}/relatorio`, [A, R]],
  ['get', `/vagas/${ID}/candidaturas`, [A, R]],
  ['post', `/vagas/${ID}/candidaturas/${OUTRO}/reavaliar`, [A, R, S]],
  ['get', `/vagas/${ID}/candidaturas/${OUTRO}/ficha`, [A, R, S]],
  // Questionario e perguntas
  ['get', '/questionario', [A, R, C]],
  ['get', `/questionario/${ID}`, [A, R, C]],
  ['post', '/questionario', [A, R]],
  ['put', `/questionario/${ID}`, [A, R]],
  ['patch', `/questionario/${ID}/ativo`, [A, R]],
  ['delete', `/questionario/${ID}`, [A, R]],
  ['get', '/pergunta', [A, R]],
  ['post', '/pergunta', [A, R]],
  ['patch', '/pergunta/reordenar', [A, R]],
  ['post', `/pergunta/${ID}/opcao`, [A, R]],
  // Respostas do questionario
  ['post', '/resposta-questionario/iniciar', [A, C]],
  ['post', `/resposta-questionario/${ID}/responder`, [A, C]],
  ['patch', `/resposta-questionario/${ID}/finalizar`, [A, C]],
  ['get', `/resposta-questionario/${ID}`, [A, C]],
  // Identidade e autoexclusao: todo papel
  ['get', '/me', [A, R, C, S]],
  // CRUD administrativo
  ['get', '/rotas', [A]],
  ['post', '/rotas', [A]],
  ['patch', `/rotas/${ID}`, [A]],
  ['get', '/grupos', [A]],
  ['post', '/grupos', [A]],
  ['delete', `/grupos/${ID}`, [A]],
];

const CASOS = MATRIZ.flatMap(([metodo, caminho, permitidos]) =>
  PAPEIS.map((papel) => [papel, metodo.toUpperCase(), caminho, permitidos.includes(papel)]),
);

describe('E2E — RBAC por papel', () => {
  let app;
  const sessoes = {};

  // Uma sessao por papel para a suite inteira: o banco nao e limpo entre os
  // casos porque nenhum deles passa do RBAC com efeito (ids ficticios).
  beforeAll(async () => {
    app = await subirAmbiente();
    for (const papel of PAPEIS) {
      sessoes[papel] = await criarUsuarioLogado(app, papel);
    }
  });
  afterAll(derrubarAmbiente);

  it.each(CASOS)('%s %s %s → permitido: %s', async (papel, metodo, caminho, permitido) => {
    const res = await sessoes[papel][metodo.toLowerCase()](`/api${caminho}`).send({});

    expect(res.status).not.toBe(401);
    if (permitido) {
      expect(res.status).not.toBe(403);
    } else {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  describe('acesso ao próprio recurso (allowSelf)', () => {
    it('candidato lê e edita o próprio perfil, mas não o de outra pessoa', async () => {
      const candidato = sessoes[C];
      await candidato.get(`/api/usuarios/${candidato.id}`).expect(200);
      await candidato.patch(`/api/usuarios/${candidato.id}`).send({ nome: 'Nome Novo' }).expect(200);
      await candidato.get(`/api/usuarios/${sessoes[R].id}`).expect(403);
    });

    it('candidato edita o próprio currículo', async () => {
      const candidato = sessoes[C];
      await candidato
        .post(`/api/usuarios/${candidato.id}/habilidade`)
        .send({ habilidade: 'SQL', nivel: 'basico' })
        .expect(201);
    });

    it('candidato não muda o status da própria candidatura', async () => {
      const candidato = sessoes[C];
      await candidato
        .patch(`/api/usuarios/${candidato.id}/candidatura/${ID}/status`)
        .send({ status: 'aprovado' })
        .expect(403);
    });

    it('candidato não reativa nem altera o status da própria conta', async () => {
      const candidato = sessoes[C];
      await candidato.patch(`/api/usuarios/${candidato.id}/status`).send({ status_ativo: true }).expect(403);
    });

    it('ninguém se promove pelo PATCH do próprio perfil', async () => {
      const candidato = sessoes[C];
      await candidato
        .patch(`/api/usuarios/${candidato.id}`)
        .send({ tipos_permissao: ['administrador'] })
        .expect(400);

      const me = await candidato.get('/api/me').expect(200);
      expect(me.body.data.tipos_permissao).toEqual(['candidato']);
    });

    it('suporte não lê o currículo de um candidato', async () => {
      await sessoes[S].get(`/api/usuarios/${sessoes[C].id}/habilidade`).expect(403);
    });
  });
});

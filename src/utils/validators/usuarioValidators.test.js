import {
  validateConvite,
  validateAtivacao,
  validateStatus,
  validateListQuery,
  validatePatchUsuario,
} from './usuarioValidators.js';

const codigo = (fn) => {
  try {
    fn();
  } catch (erro) {
    return erro.code;
  }
  return null;
};

describe('validateConvite', () => {
  it('normaliza nome, email e papel', () => {
    expect(validateConvite({ nome: '  Ana  ', email: ' ANA@T.COM ', papel: 'Recrutador' }))
      .toEqual({ nome: 'Ana', email: 'ana@t.com', papel: 'recrutador' });
  });

  it.each(['administrador', 'candidato', '', undefined])('recusa papel %p', (papel) => {
    expect(codigo(() => validateConvite({ nome: 'Ana', email: 'a@t.com', papel }))).toBe('VALIDATION_ERROR');
  });

  it('recusa email invalido', () => {
    expect(codigo(() => validateConvite({ nome: 'Ana', email: 'ana', papel: 'suporte' }))).toBe('VALIDATION_ERROR');
  });

  it('recusa nome curto', () => {
    expect(codigo(() => validateConvite({ nome: 'A', email: 'a@t.com', papel: 'suporte' }))).toBe('VALIDATION_ERROR');
  });
});

describe('validateAtivacao', () => {
  it('aceita senha forte', () => {
    expect(validateAtivacao({ token: 'tok', senha: 'Senha@123' })).toEqual({ token: 'tok', senha: 'Senha@123' });
  });

  it.each(['Cu1!', 'semmaiuscula1!', 'SEMMINUSCULA1!', 'SemNumero!!', 'SemEspecial12'])(
    'recusa senha fraca %p',
    (senha) => {
      expect(codigo(() => validateAtivacao({ token: 'tok', senha }))).toBe('SENHA_FRACA');
    },
  );

  it('recusa token ausente', () => {
    expect(codigo(() => validateAtivacao({ senha: 'Senha@123' }))).toBe('VALIDATION_ERROR');
  });
});

describe('validateStatus', () => {
  it('aceita booleano', () => {
    expect(validateStatus({ status_ativo: false })).toEqual({ status_ativo: false });
  });

  it('recusa texto', () => {
    expect(codigo(() => validateStatus({ status_ativo: 'false' }))).toBe('VALIDATION_ERROR');
  });
});

describe('validateListQuery', () => {
  it('le varios papeis separados por virgula e descarta os invalidos', () => {
    expect(validateListQuery({ papel: 'recrutador, suporte,xpto' }).papel).toEqual(['recrutador', 'suporte']);
  });

  it('papel unico vira lista de um', () => {
    expect(validateListQuery({ papel: 'suporte' }).papel).toEqual(['suporte']);
  });

  it('sem papel valido, nao filtra', () => {
    expect(validateListQuery({ papel: 'xpto' }).papel).toBeUndefined();
  });

  it('aceita situacao conhecida e ignora a desconhecida', () => {
    expect(validateListQuery({ situacao: 'pendente' }).situacao).toBe('pendente');
    expect(validateListQuery({ situacao: 'qualquer' }).situacao).toBeUndefined();
  });
});

describe('validatePatchUsuario', () => {
  it.each([
    [{ tipos_permissao: ['administrador'] }],
    [{ status_ativo: false }],
    [{ nome: 'Ana Maria', tipos_permissao: ['administrador'] }],
    [{ nome: 'Ana Maria', status_ativo: true }],
  ])('recusa alteracao de papel ou status %p', (payload) => {
    let erro;
    try {
      validatePatchUsuario(payload);
    } catch (e) {
      erro = e;
    }
    expect(erro?.code).toBe('VALIDATION_ERROR');
    expect(erro?.statusCode).toBe(400);
    expect(erro?.message).toMatch(/tipos_permissao e status_ativo não podem ser alterados/);
  });

  it('aceita os campos do perfil', () => {
    expect(
      validatePatchUsuario({
        nome: ' Ana Maria ',
        email: 'ANA@T.COM',
        senha: 'Senha@123',
        telefone: '11999999999',
        linkedin: 'linkedin.com/in/ana-maria',
        cidade: 'Campinas',
      }),
    ).toEqual({
      nome: 'Ana Maria',
      email: 'ana@t.com',
      senha: 'Senha@123',
      telefone: '11999999999',
      linkedin: 'https://www.linkedin.com/in/ana-maria',
      cidade: 'Campinas',
    });
  });
});

const authSchemas = {
  AuthUser: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'usr_1234567890' },
      name: { type: 'string', example: 'Maria RH' },
      email: { type: 'string', format: 'email', example: 'maria.rh@empresa.com' },
      image: { type: 'string', nullable: true, example: null },
    },
  },
  AuthSession: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'sess_1234567890' },
      userId: { type: 'string', example: 'usr_1234567890' },
      expiresAt: { type: 'string', format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      token: { type: 'string', example: 'eyJhbGciOi...' },
    },
  },
  AuthSignUpRequest: {
    type: 'object',
    required: ['name', 'email', 'password'],
    properties: {
      name: { type: 'string', example: 'Maria RH' },
      email: { type: 'string', format: 'email', example: 'maria.rh@empresa.com' },
      password: { type: 'string', format: 'password', example: 'SenhaForte123!' },
    },
  },
  AuthSignInRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'maria.rh@empresa.com' },
      password: { type: 'string', format: 'password', example: 'SenhaForte123!' },
    },
  },
  AuthSignInResponse: {
    type: 'object',
    properties: {
      token: { type: 'string', example: 'eyJhbGciOi...' },
      user: { $ref: '#/components/schemas/AuthUser' },
      redirect: { type: 'boolean', example: false },
    },
  },
  AuthSessionResponse: {
    type: 'object',
    nullable: true,
    properties: {
      session: { $ref: '#/components/schemas/AuthSession' },
      user: { $ref: '#/components/schemas/AuthUser' },
    },
  },
  AuthSignOutResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
    },
  },
  AuthMeResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: { $ref: '#/components/schemas/AuthUser' },
    },
  },
  AuthErrorResponse: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        example: '[body.email] Invalid input: expected string, received undefined',
      },
      code: { type: 'string', example: 'VALIDATION_ERROR' },
    },
  },
};

export default authSchemas;

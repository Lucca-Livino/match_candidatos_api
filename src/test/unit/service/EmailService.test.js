import { EmailService } from '../../../service/EmailService.js';

const ENV = {
  EMAIL_USER: 'rh@empresa.com',
  EMAIL_APP_PASSWORD: 'x',
  FRONTEND_URL: 'http://localhost:5173/',
  COMPANY_NAME: 'Empresa Teste',
};

const convite = { nome: 'Ana <b>', email: 'ana@t.com', papel: 'recrutador', token: 'abc+/=' };

describe('EmailService', () => {
  it('monta o link de ativacao com o token codificado e sem barra dupla', () => {
    const service = new EmailService({ transporter: { sendMail: jest.fn() }, env: ENV });
    expect(service.linkAtivacao('abc+/=')).toBe('http://localhost:5173/ativar-conta?token=abc%2B%2F%3D');
  });

  it('envia o convite com destinatario, assunto e link', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: '1' });
    const service = new EmailService({ transporter: { sendMail }, env: ENV });

    const resultado = await service.enviarConvite(convite);

    expect(resultado).toEqual({ enviado: true });
    const opcoes = sendMail.mock.calls[0][0];
    expect(opcoes.to).toBe('ana@t.com');
    expect(opcoes.from).toBe('"Empresa Teste" <rh@empresa.com>');
    expect(opcoes.subject).toMatch(/convite/i);
    expect(opcoes.html).toContain('ativar-conta?token=abc%2B%2F%3D');
    expect(opcoes.text).toContain('ativar-conta?token=abc%2B%2F%3D');
  });

  it('escapa o nome no HTML', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    const service = new EmailService({ transporter: { sendMail }, env: ENV });
    await service.enviarConvite(convite);
    expect(sendMail.mock.calls[0][0].html).toContain('Ana &lt;b&gt;');
  });

  it('tenta de novo e desiste depois da terceira falha', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('smtp fora'));
    const esperar = jest.fn().mockResolvedValue();
    const service = new EmailService({ transporter: { sendMail }, env: ENV, esperar });

    await expect(service.enviarConvite(convite)).rejects.toThrow('smtp fora');
    expect(sendMail).toHaveBeenCalledTimes(3);
    expect(esperar).toHaveBeenCalledTimes(2);
  });

  it('recupera na segunda tentativa', async () => {
    const sendMail = jest.fn().mockRejectedValueOnce(new Error('instavel')).mockResolvedValueOnce({});
    const service = new EmailService({ transporter: { sendMail }, env: ENV, esperar: jest.fn().mockResolvedValue() });

    await expect(service.enviarConvite(convite)).resolves.toEqual({ enviado: true });
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('sem credencial, nao envia e registra o link no log', async () => {
    const service = new EmailService({ env: { FRONTEND_URL: 'http://localhost:5173' } });
    const log = jest.spyOn(console, 'log');

    const resultado = await service.enviarConvite(convite);

    expect(resultado).toEqual({ enviado: false });
    expect(log.mock.calls.flat().join(' ')).toContain('/ativar-conta?token=abc%2B%2F%3D');
  });

  it('em producao sem credencial, recusa o convite e nao registra o link', async () => {
    const service = new EmailService({ env: { NODE_ENV: 'production', FRONTEND_URL: 'http://localhost:5173' } });
    const espioes = ['log', 'info', 'warn', 'error', 'debug'].map((metodo) =>
      jest.spyOn(console, metodo).mockImplementation(() => {}),
    );
    espioes.forEach((espiao) => espiao.mockClear());

    await expect(service.enviarConvite(convite)).rejects.toThrow('Serviço de e-mail não configurado.');

    const registrado = espioes.flatMap((espiao) => espiao.mock.calls.flat()).join(' ');
    expect(registrado).not.toContain('ativar-conta');
    expect(registrado).not.toContain('abc%2B%2F%3D');
    espioes.forEach((espiao) => espiao.mockRestore());
  });
});

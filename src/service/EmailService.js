import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

// Porte do EmailService do estoque-inteligente-api, reduzido ao que este
// sistema envia: o convite de conta interna.
const MAX_TENTATIVAS = 3;
const BACKOFF_MS = 1000;

const NOME_PAPEL = { recrutador: 'recrutador(a)', suporte: 'suporte' };

function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const esperarPadrao = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class EmailService {
  constructor({ transporter, env = process.env, esperar = esperarPadrao } = {}) {
    this.env = env;
    this.esperar = esperar;
    this.transporter = transporter ?? this.criarTransporter();
  }

  criarTransporter() {
    if (!this.env.EMAIL_USER || !this.env.EMAIL_APP_PASSWORD) return null;

    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: this.env.EMAIL_USER, pass: this.env.EMAIL_APP_PASSWORD },
    });
  }

  linkAtivacao(token) {
    const base = String(this.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    return `${base}/ativar-conta?token=${encodeURIComponent(token)}`;
  }

  async enviarConvite({ nome, email, papel, token }) {
    const link = this.linkAtivacao(token);

    // Sem credencial (desenvolvimento local), o fluxo continua testavel: o link
    // vai para o log do servidor. Ele nunca volta na resposta da API, porque
    // quem tem o link define a senha da conta.
    if (!this.transporter) {
      // Em producao, porem, "sucesso" sem envio deixaria o administrador
      // achando que o convite saiu, e o link ficaria exposto no log. Falhar
      // aqui faz o ConviteService desfazer a conta e responder EMAIL_FALHOU.
      if (this.env.NODE_ENV === 'production') {
        throw new Error('Servico de e-mail nao configurado.');
      }
      logger.info(`[e-mail desativado] Convite para ${email}: ${link}`);
      return { enviado: false };
    }

    const empresa = this.env.COMPANY_NAME || 'Recursos Humanos';
    const funcao = NOME_PAPEL[papel] ?? papel;

    await this.enviarComRetry({
      from: `"${empresa}" <${this.env.EMAIL_USER}>`,
      to: email,
      subject: `Convite para acessar ${empresa}`,
      text: `Ola, ${nome}. Voce foi convidado(a) como ${funcao}. Defina sua senha em: ${link} (o link expira em 24 horas).`,
      html: `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1e2a4a; font-size: 22px;">Convite para acessar ${esc(empresa)}</h1>
    <p>Ola, ${esc(nome)}.</p>
    <p>Voce foi convidado(a) como <strong>${esc(funcao)}</strong>. Para entrar, defina sua senha:</p>
    <p style="margin: 28px 0;">
      <a href="${esc(link)}" style="background: #1e2a4a; color: #fff; padding: 12px 24px; border-radius: 4px; text-decoration: none;">Definir minha senha</a>
    </p>
    <p style="font-size: 13px; color: #666;">O link expira em 24 horas. Se expirar, peca um novo convite ao administrador.</p>
    <p style="font-size: 12px; color: #999; word-break: break-all;">${esc(link)}</p>
  </div>
</body>
</html>`,
    });

    return { enviado: true };
  }

  async enviarComRetry(opcoes) {
    let ultimoErro;

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
      try {
        return await this.transporter.sendMail(opcoes);
      } catch (erro) {
        ultimoErro = erro;
        logger.error(`Falha no envio de e-mail (tentativa ${tentativa}/${MAX_TENTATIVAS}): ${erro?.message}`);
        if (tentativa < MAX_TENTATIVAS) await this.esperar(BACKOFF_MS * tentativa);
      }
    }

    throw ultimoErro;
  }
}

export default new EmailService();

# Match de Curriculos API

API Node.js para o projeto de match de curriculos.

## Stack
- Node.js + Express
- MongoDB + Mongoose
- Jest + Supertest + mongodb-memory-server

## Executar localmente
1. Copie `.env.example` para `.env`.
2. Ajuste `DB_URL` para o seu MongoDB local.
3. Defina as variaveis de auth no `.env`:
	- `BETTER_AUTH_SECRET`
	- `BETTER_AUTH_URL`
	- `BETTER_AUTH_TRUSTED_ORIGINS`
4. Instale dependencias:

```bash
npm install
```

5. Suba a API:

```bash
npm run dev
```

## Autenticacao (Better Auth)

- Handler automatico: `POST/GET /api/auth/*`
- Login: `POST /api/auth/sign-in/email`
- Cadastro: `POST /api/auth/sign-up/email`
- Sessao atual: `GET /api/auth/get-session`
- Perfil autenticado: `GET /api/me`

## Testes

```bash
npm test
```



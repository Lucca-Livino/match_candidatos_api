import bcrypt from 'bcrypt';

const DEFAULT_SALT_ROUNDS = 10;

const resolveSaltRounds = () => {
  const value = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '', 10);

  if (!Number.isInteger(value) || value < 4 || value > 15) {
    return DEFAULT_SALT_ROUNDS;
  }

  return value;
};

export const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, resolveSaltRounds());

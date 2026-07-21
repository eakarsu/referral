function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function loadConfig() {
  const databaseUrl = required('DATABASE_URL');
  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  const corsOrigins = required('CORS_ORIGINS').split(',').map((item) => item.trim()).filter(Boolean);
  if (!corsOrigins.length || corsOrigins.includes('*')) throw new Error('CORS_ORIGINS must list exact origins');
  const port = Number(process.env.SERVER_PORT || 3071);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SERVER_PORT is invalid');
  return { databaseUrl, jwtSecret, corsOrigins, port };
}

module.exports = { loadConfig };

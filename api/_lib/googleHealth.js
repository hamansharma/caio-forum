import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

export const GOOGLE_HEALTH_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function encryptionKey() {
  const key = Buffer.from(requiredEnv('HEALTH_TOKEN_ENCRYPTION_KEY'), 'base64');
  if (key.length !== 32) throw new Error('HEALTH_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  return key;
}

export function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

export function decrypt(value) {
  const payload = Buffer.from(value, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString('utf8');
}

export function createOAuthClient() {
  return new OAuth2Client(
    requiredEnv('GOOGLE_HEALTH_CLIENT_ID'),
    requiredEnv('GOOGLE_HEALTH_CLIENT_SECRET'),
    requiredEnv('GOOGLE_HEALTH_REDIRECT_URI'),
  );
}

export function getAuthorizationUrl(state) {
  return createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: GOOGLE_HEALTH_SCOPES,
    state,
  });
}

export async function exchangeCode(code) {
  const { tokens } = await createOAuthClient().getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) throw new Error('Google did not return the long-term access needed to connect your health data.');
  return tokens;
}

export async function refreshAccessToken(refreshToken) {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Unable to refresh Google Health access.');
  return { accessToken: token, expiresAt: client.credentials.expiry_date || Date.now() + 3_600_000 };
}

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '../_lib/firebaseAdmin';
import { encrypt, exchangeCode } from '../_lib/googleHealth';

function redirect(res, status) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return res.redirect(`${appUrl}/health?connection=${status}`);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const { code, state, error } = req.query;
  if (error || !code || !state || typeof code !== 'string' || typeof state !== 'string') return redirect(res, 'cancelled');

  const stateRef = adminDb.collection('healthOAuthStates').doc(state);
  try {
    const stateDoc = await stateRef.get();
    if (!stateDoc.exists || stateDoc.data().expiresAt.toMillis() < Date.now()) {
      await stateRef.delete();
      return redirect(res, 'expired');
    }
    const tokens = await exchangeCode(code);
    await adminDb.collection('healthConnections').doc(stateDoc.data().uid).set({
      provider: 'google-health',
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      expiresAt: Timestamp.fromMillis(tokens.expiry_date || Date.now() + 3_600_000),
      scopes: tokens.scope?.split(' ') || [],
      connectedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });
    await stateRef.delete();
    return redirect(res, 'connected');
  } catch (err) {
    console.error('Google Health callback failed:', err.message);
    await stateRef.delete().catch(() => undefined);
    return redirect(res, 'error');
  }
}

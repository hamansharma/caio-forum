import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, requireUser } from '../_lib/firebaseAdmin';
import { decrypt, encrypt, refreshAccessToken } from '../_lib/googleHealth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await requireUser(req);
    const ref = adminDb.collection('healthConnections').doc(user.uid);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data().provider !== 'google-health') return res.status(404).json({ error: 'No Google Health connection found.' });
    let connection = snapshot.data();
    if (connection.expiresAt.toMillis() < Date.now() + 60_000) {
      const refreshed = await refreshAccessToken(decrypt(connection.refreshToken));
      await ref.set({ accessToken: encrypt(refreshed.accessToken), expiresAt: Timestamp.fromMillis(refreshed.expiresAt), updatedAt: Timestamp.now() }, { merge: true });
      connection = { ...connection, accessToken: encrypt(refreshed.accessToken) };
    }
    const response = await fetch('https://health.googleapis.com/v4/users/me/identity', {
      headers: { Authorization: `Bearer ${decrypt(connection.accessToken)}`, Accept: 'application/json' },
    });
    const identity = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: identity.error?.message || 'Google Health did not return an identity.' });
    await ref.set({ healthUserId: identity.healthUserId, identityVerifiedAt: Timestamp.now() }, { merge: true });
    return res.status(200).json({ connected: true });
  } catch (error) {
    console.error('Google Health verification failed:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to verify Google Health connection.' });
  }
}

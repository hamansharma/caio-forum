import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, requireUser } from '../_lib/firebaseAdmin';
import { getAuthorizationUrl } from '../_lib/googleHealth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await requireUser(req);
    const state = crypto.randomBytes(32).toString('base64url');
    await adminDb.collection('healthOAuthStates').doc(state).set({
      uid: user.uid,
      expiresAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
    });
    return res.status(200).json({ authorizationUrl: getAuthorizationUrl(state) });
  } catch (error) {
    console.error('Unable to start Google Health authorization:', error.message);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to start health connection.' });
  }
}

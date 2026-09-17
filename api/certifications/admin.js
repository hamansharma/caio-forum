import { requireUser } from '../_lib/firebaseAdmin';
import { isCertificationAdmin } from '../_lib/certificationAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const user = await requireUser(req);
    return res.status(200).json({ isAdmin: isCertificationAdmin(user) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to check access.' });
  }
}

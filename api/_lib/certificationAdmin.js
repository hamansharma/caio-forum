const ADMIN_EMAILS = (process.env.CERTIFICATION_ADMIN_EMAILS || '')
  .split(',').map(email => email.trim().toLowerCase()).filter(Boolean);

export function isCertificationAdmin(user) {
  return Boolean(user?.email_verified && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
}

export function requireCertificationAdmin(user) {
  if (!isCertificationAdmin(user)) {
    const error = new Error('Administrator access required.');
    error.statusCode = 403;
    throw error;
  }
}

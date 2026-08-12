export const LIMITS = {
  POST_TITLE_MAX: 300,
  POST_BODY_MAX: 50000,
  COMMENT_MAX: 10000,
  USERNAME_MIN: 2,
  USERNAME_MAX: 50,
};

export function validatePostTitle(title) {
  const t = title?.trim() || '';
  if (!t) return 'Title is required.';
  if (t.length < 5) return 'Title must be at least 5 characters.';
  if (t.length > LIMITS.POST_TITLE_MAX) return `Title must be under ${LIMITS.POST_TITLE_MAX} characters.`;
  return null;
}

export function validatePostBody(body) {
  const b = body?.trim() || '';
  if (!b) return 'Body is required.';
  if (b.length < 10) return 'Body must be at least 10 characters.';
  if (b.length > LIMITS.POST_BODY_MAX) return `Body must be under ${LIMITS.POST_BODY_MAX.toLocaleString()} characters.`;
  return null;
}

export function validateComment(body) {
  const b = body?.trim() || '';
  if (!b) return 'Comment cannot be empty.';
  if (b.length > LIMITS.COMMENT_MAX) return `Comment must be under ${LIMITS.COMMENT_MAX.toLocaleString()} characters.`;
  return null;
}

export function validateUsername(username) {
  const u = username?.trim() || '';
  if (!u) return 'Username is required.';
  if (u.length < LIMITS.USERNAME_MIN) return `Username must be at least ${LIMITS.USERNAME_MIN} characters.`;
  if (u.length > LIMITS.USERNAME_MAX) return `Username must be under ${LIMITS.USERNAME_MAX} characters.`;
  if (!/^[a-zA-Z0-9_\- ]+$/.test(u)) return 'Username can only contain letters, numbers, spaces, hyphens and underscores.';
  return null;
}

export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  // Trim excessive whitespace while preserving intentional line breaks
  return text
    .replace(/\r\n/g, '\n')        // normalize line endings
    .replace(/\r/g, '\n')          // normalize old Mac line endings
    .replace(/\t/g, '    ')        // normalize tabs to spaces
    .replace(/[ \t]+$/gm, '')      // trim trailing whitespace per line
    .replace(/\n{4,}/g, '\n\n\n') // max 3 consecutive blank lines
    .trim();
}
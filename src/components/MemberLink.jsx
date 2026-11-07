import React from 'react';
import { Link } from 'react-router-dom';
import { memberPath } from '../utils/postUrl';

// "u/name" linking to the member's public page; plain text for placeholder
// authors (deleted, moderated, anonymous), which have no page.
export default function MemberLink({ name, className = '' }) {
  const path = memberPath(name);
  if (!path) return <span className={className}>{name}</span>;
  return <Link to={path} className={`member-link ${className}`.trim()}>u/{name}</Link>;
}

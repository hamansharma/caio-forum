import React from 'react';
import { Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';

export default function NotFound() {
  usePageMeta('Page Not Found | CAIO Forum', 'The requested CAIO Forum page could not be found.', { noIndex: true });
  return <main className="not-found"><h1>Page not found</h1><p>The page you requested does not exist or may have moved.</p><Link to="/">Return to CAIO Forum</Link></main>;
}

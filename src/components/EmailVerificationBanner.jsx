import React, { useEffect, useState } from 'react';
import { useForum } from '../context/ForumContext';
import './EmailVerificationBanner.css';

// Shown to members who signed up with email and haven't clicked the verification
// link yet: they can read everything but can't post, comment or vote until they do.
// Checks again whenever the tab regains focus, so clicking the link in the email
// (in another tab) unlocks posting without a reload.
export default function EmailVerificationBanner() {
  const { user, resendVerificationEmail, refreshEmailVerified } = useForum();
  const [status, setStatus] = useState('');
  const unverified = Boolean(user && !user.emailVerified);

  useEffect(() => {
    if (!unverified) return undefined;
    const check = () => { refreshEmailVerified().catch(() => {}); };
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [unverified, refreshEmailVerified]);

  if (!unverified) return null;

  const resend = async () => {
    setStatus('sending');
    try {
      await resendVerificationEmail();
      setStatus('sent');
    } catch (error) {
      setStatus(error.code === 'auth/too-many-requests' ? 'wait' : 'failed');
    }
  };

  const checkNow = async () => {
    setStatus('checking');
    try {
      if (!(await refreshEmailVerified())) setStatus('not-yet');
    } catch {
      setStatus('failed');
    }
  };

  const message = {
    sent: `Sent. Check ${user.email} (and your spam folder).`,
    wait: 'An email was sent recently. Please wait a few minutes before trying again.',
    failed: 'Something went wrong. Please try again.',
    'not-yet': 'Not verified yet. Click the link in the email, then try again.',
  }[status];

  return (
    <div className="verify-banner" role="status">
      <p>
        <strong>Verify your email to post, comment and vote.</strong>{' '}
        We sent a link to {user.email}.
        {message && <span className="verify-banner-status"> {message}</span>}
      </p>
      <div className="verify-banner-actions">
        <button type="button" onClick={checkNow} disabled={status === 'checking'}>I&apos;ve verified</button>
        <button type="button" onClick={resend} disabled={status === 'sending'}>Resend email</button>
      </div>
    </div>
  );
}

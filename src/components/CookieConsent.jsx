import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnalyticsConsent, setAnalyticsConsent, onOpenCookieSettings } from '../utils/analyticsConsent';
import './CookieConsent.css';

// Asks once whether Google Analytics may set cookies. Reopened from the footer's
// "Cookie settings" link.
export default function CookieConsent() {
  const [open, setOpen] = useState(() => getAnalyticsConsent() === null);

  useEffect(() => onOpenCookieSettings(() => setOpen(true)), []);

  if (!open) return null;

  const choose = granted => {
    setAnalyticsConsent(granted);
    setOpen(false);
  };

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie preferences">
      <p>
        We use Google Analytics cookies to understand how the site is used. You can change this anytime from
        “Cookie settings” at the bottom of the page. <Link to="/privacy">Privacy Policy</Link>
      </p>
      <div className="cookie-consent-actions">
        <button className="cookie-decline" onClick={() => choose(false)}>Decline</button>
        <button className="cookie-accept" onClick={() => choose(true)}>Accept</button>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';
import { LEGAL_CONTACT_EMAIL, PRIVACY_EFFECTIVE_DATE } from '../data/legal';
import './Legal.css';

export default function PrivacyPolicy() {
  usePageMeta('Privacy Policy | CAIO Forum', 'How CAIO Forum and the AI Playground collect, use, share, and protect your information.', { canonicalPath: '/privacy' });
  const mail = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;

  return (
    <main className="legal-page">
      <header className="legal-hero">
        <span className="legal-eyebrow"><ShieldCheck size={15} /> Legal</span>
        <h1>Privacy Policy</h1>
        <p>This policy explains what information CAIO Forum (“we”, “us”) collects when you use caioleadership.com, including the forum, the AI assistant, and the AI Playground tools, and how that information is used.</p>
        <p className="legal-updated">Effective {PRIVACY_EFFECTIVE_DATE}</p>
      </header>

      <aside className="legal-summary">
        <h2>The short version</h2>
        <ul>
          <li>We collect what you give us (account details, posts, tool inputs) and limited technical data needed to run the site.</li>
          <li>We do not sell your personal information or use it for advertising.</li>
          <li>Some features send your input to AI and infrastructure providers so they can work.</li>
          <li>Google Health data is read-only, used only to show you your own insights, and never sold or used for ads.</li>
          <li>You can ask us to access or delete your data at any time.</li>
        </ul>
      </aside>

      <section className="legal-section">
        <h2>1. Information we collect</h2>
        <h3>Account information</h3>
        <p>When you create an account, we collect your email address, full name, and the display name you choose. If you sign in with Google, we receive your name, email address, and Google account identifier from Google. Passwords are handled by Firebase Authentication and are never visible to us.</p>
        <h3>Content you post</h3>
        <p>Posts, comments, and votes you make on the forum are stored with your display name. <strong>Posts and comments are public</strong> and can be read by anyone visiting the site, including search engines.</p>
        <h3>AI Playground inputs</h3>
        <ul>
          <li><strong>CAIO Compass:</strong> your assessment answers, optional organization name, and results.</li>
          <li><strong>Vendor Portfolio:</strong> the tools, vendors, and notes you add, and the analyses generated from them.</li>
          <li><strong>Certifications:</strong> certification suggestions and reports you submit, and pathway activity.</li>
          <li><strong>Project requests:</strong> the ideas you submit and, only if you opt in to be contacted, your account email.</li>
        </ul>
        <h3>AI assistant conversations</h3>
        <p>The on-site AI assistant is available to signed-in members. Messages you send to it are sent to our AI provider, together with the forum posts most relevant to your question, to generate a reply. We do not store chatbot conversations. To prevent abuse and control costs, we keep a count of how many messages each account sends per hour and per day.</p>
        <h3>Google Health data (optional)</h3>
        <p>If you choose to connect Google Health on the Personal Signals page, we request <strong>read-only</strong> access to activity and fitness, health metrics and measurements, and sleep data. We store daily summaries (such as steps, sleep duration, resting heart rate, and workouts) and AI-generated insights about them. Your Google access tokens are encrypted before they are stored.</p>
        <h3>Technical and usage data</h3>
        <p>We use Vercel Analytics and Speed Insights to understand aggregate traffic and page performance; these do not use cookies. We also use Google Analytics to understand how visitors use the site, such as which pages they view and how they arrived. Google Analytics sets cookies only if you accept them in our cookie banner. If you decline or haven’t chosen, it sends limited cookieless measurements that don’t identify your browser across visits. Advertising features are turned off. Our hosting provider also processes standard request data such as IP address, browser type, and timestamps.</p>
        <h3>Data stored in your browser</h3>
        <p>We use your browser’s local storage for preferences such as your theme choice, your cookie choice, and certification progress, and Firebase stores your sign-in session. The only analytics cookies are Google Analytics cookies, set only with your consent. You can change your choice at any time with “Cookie settings” at the bottom of every page. We do not use advertising cookies.</p>
      </section>

      <section className="legal-section">
        <h2>2. How we use information</h2>
        <ul>
          <li>To provide the forum and Playground tools, including saving your work and showing your results.</li>
          <li>To generate AI responses, insights, and analyses you request.</li>
          <li>To moderate content, review submissions, and keep the service secure, including rate limiting and abuse prevention.</li>
          <li>To respond to you when you contact us or opt in to follow-up on a project request.</li>
          <li>To understand aggregate usage and improve the site.</li>
        </ul>
        <p>We do not sell your personal information, and we do not use it for advertising.</p>
      </section>

      <section className="legal-section">
        <h2>3. How we share information</h2>
        <p>We share information only with service providers that help us run the site, and only as needed for them to provide their service:</p>
        <ul>
          <li><strong>Google Firebase</strong> for authentication and database storage.</li>
          <li><strong>Vercel</strong> for hosting, serverless functions, and analytics.</li>
          <li><strong>Anthropic</strong> to generate AI assistant replies, vendor portfolio analyses, and Google Health insights. Only the content needed for the specific request is sent.</li>
          <li><strong>Google</strong>, for Google Analytics, and when you choose to sign in with Google or connect Google Health.</li>
        </ul>
        <p>We may also disclose information if required by law, to protect the rights and safety of our users or others, or in connection with a transfer of the service. Public posts and comments are visible to everyone.</p>
      </section>

      <section className="legal-section">
        <h2>4. Google user data</h2>
        <p>Our use and transfer of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements. Specifically:</p>
        <ul>
          <li>Google Health data is used only to show you your own health summaries, charts, and insights.</li>
          <li>It is shared with Anthropic only to generate the insights you see, and with no one else except as required by law.</li>
          <li>It is never sold, used for advertising, or used to determine credit-worthiness.</li>
          <li>It is never used to train generalized AI or machine learning models.</li>
          <li>Humans do not read it unless you ask us to, it is necessary for security or legal reasons, or it has been aggregated and anonymized.</li>
        </ul>
        <p>Health insights are informational only and are not medical advice.</p>
      </section>

      <section className="legal-section">
        <h2>5. Data retention and deletion</h2>
        <p>We keep your information while your account is active or as needed to provide the service.</p>
        <p>You can delete your account from your <Link to="/profile">profile page</Link>. This removes your sign-in and profile, and replaces your posts and comments with “[deleted]”. Data from the Playground tools and Google Health is not removed automatically by this action. To have that data deleted as well, email {mail} and we will delete it within 30 days.</p>
        <p>You can also revoke CAIO Forum’s access to Google Health at any time from your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account permissions</a>.</p>
      </section>

      <section className="legal-section">
        <h2>6. Your choices and rights</h2>
        <p>Depending on where you live, you may have the right to access, correct, delete, or export your personal information, or to object to certain processing. To make a request, email {mail}. We will respond within a reasonable time and may need to verify your identity first.</p>
        <p>You can choose a random or custom display name instead of your real name, decline to connect Google Health, and decline to be contacted about project requests.</p>
      </section>

      <section className="legal-section">
        <h2>7. Security</h2>
        <p>We use HTTPS, restricted server-only access to sensitive collections, and encryption for stored Google tokens. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.</p>
      </section>

      <section className="legal-section">
        <h2>8. Children</h2>
        <p>CAIO Forum is intended for professionals and is not directed to children under 16. We do not knowingly collect personal information from children. If you believe a child has provided us information, please contact us and we will delete it.</p>
      </section>

      <section className="legal-section">
        <h2>9. International users</h2>
        <p>Our service providers may process your information in the United States and other countries where they operate. By using the site, you understand that your information may be transferred to and processed in those countries.</p>
      </section>

      <section className="legal-section">
        <h2>10. Changes to this policy</h2>
        <p>We may update this policy from time to time. When we do, we will change the effective date above, and for significant changes we will provide a more prominent notice on the site.</p>
      </section>

      <section className="legal-section">
        <h2>11. Contact</h2>
        <p>Questions or requests about this policy can be sent to {mail}. See also our <Link to="/terms">Terms of Service</Link>.</p>
      </section>
    </main>
  );
}

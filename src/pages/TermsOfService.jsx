import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';
import { LEGAL_CONTACT_EMAIL, LEGAL_EFFECTIVE_DATE } from '../data/legal';
import './Legal.css';

export default function TermsOfService() {
  usePageMeta('Terms of Service | CAIO Forum', 'The terms that govern your use of CAIO Forum, the AI assistant, and the AI Playground tools.', { canonicalPath: '/terms' });
  const mail = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;

  return (
    <main className="legal-page">
      <header className="legal-hero">
        <span className="legal-eyebrow"><FileText size={15} /> Legal</span>
        <h1>Terms of Service</h1>
        <p>These terms govern your use of CAIO Forum at caioleadership.com, including the forum, the AI assistant, and the AI Playground tools (together, the “Service”). By using the Service, you agree to these terms.</p>
        <p className="legal-updated">Effective {LEGAL_EFFECTIVE_DATE}</p>
      </header>

      <section className="legal-section">
        <h2>1. Eligibility and accounts</h2>
        <p>You must be at least 16 years old to use the Service. You are responsible for the information you provide, for keeping your sign-in credentials secure, and for activity that occurs under your account. Let us know promptly if you believe your account has been compromised.</p>
      </section>

      <section className="legal-section">
        <h2>2. Your content</h2>
        <p>You keep ownership of the posts, comments, and other content you submit. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, and adapt it as needed to operate and promote the Service.</p>
        <p>Forum posts and comments are public. Do not post confidential information, including your employer’s or clients’ confidential or proprietary information.</p>
        <p>You are responsible for your content and confirm that you have the rights to share it and that it does not violate these terms or the law.</p>
      </section>

      <section className="legal-section">
        <h2>3. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Post content that is unlawful, harassing, hateful, defamatory, sexually explicit, or that infringes someone else’s rights.</li>
          <li>Impersonate others or misrepresent your affiliation with any person or organization.</li>
          <li>Post spam, advertising, or other unsolicited promotion.</li>
          <li>Share other people’s personal information without their permission.</li>
          <li>Attempt to bypass rate limits, access controls, or security measures, or access data that is not yours.</li>
          <li>Scrape, overload, or disrupt the Service, or use automated means to access it except as permitted by our robots.txt.</li>
          <li>Use the AI features to generate harmful content or to violate the usage policies of our AI providers.</li>
        </ul>
        <p>We may remove content or restrict accounts that we believe violate these terms.</p>
      </section>

      <section className="legal-section">
        <h2>4. AI features</h2>
        <p>The AI assistant, CAIO Compass, Build vs. Buy, Vendor Portfolio analysis, certification guidance, and health insights use automated tools and AI models. Their output may be inaccurate, incomplete, or out of date.</p>
        <p><strong>AI output is for informational purposes only.</strong> It is not professional, legal, financial, procurement, or medical advice. Verify important information independently and use your own judgment before acting on it.</p>
      </section>

      <section className="legal-section">
        <h2>5. Google Health and Personal Signals</h2>
        <p>Connecting Google Health is optional. Health summaries and insights are not medical advice and are not a substitute for a qualified healthcare professional. Do not use them to diagnose or treat any condition. Our handling of this data is described in our <Link to="/privacy">Privacy Policy</Link>.</p>
      </section>

      <section className="legal-section">
        <h2>6. Third-party services and links</h2>
        <p>The Service relies on third-party services such as Google, Firebase, Vercel, and Anthropic, and may link to third-party websites, including certification issuers and vendors. We are not responsible for third-party services or content, and your use of them is subject to their own terms.</p>
      </section>

      <section className="legal-section">
        <h2>7. Our intellectual property</h2>
        <p>The Service, including its design, software, and original content (other than user content), belongs to us or our licensors. You may not copy, modify, or redistribute it except as allowed by these terms or by law.</p>
      </section>

      <section className="legal-section">
        <h2>8. Changes and termination</h2>
        <p>The Service, including the AI Playground, is evolving, and we may change, suspend, or discontinue any feature at any time. You may stop using the Service and delete your account at any time from your <Link to="/profile">profile page</Link>. We may suspend or terminate access if you violate these terms or to protect the Service or its users.</p>
      </section>

      <section className="legal-section">
        <h2>9. Disclaimers</h2>
        <p>The Service is provided “as is” and “as available”, without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement. We do not guarantee that the Service will be uninterrupted, secure, or error-free.</p>
      </section>

      <section className="legal-section">
        <h2>10. Limitation of liability</h2>
        <p>To the fullest extent permitted by law, we will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or business, arising from your use of the Service or from reliance on any content or AI output. Our total liability for any claim relating to the Service will not exceed US$100.</p>
        <p>Some jurisdictions do not allow certain limitations of liability, so some of these limitations may not apply to you.</p>
      </section>

      <section className="legal-section">
        <h2>11. Indemnity</h2>
        <p>You agree to indemnify and hold us harmless from claims, damages, and expenses, including reasonable legal fees, that arise from your content or your violation of these terms.</p>
      </section>

      <section className="legal-section">
        <h2>12. Changes to these terms</h2>
        <p>We may update these terms from time to time. When we do, we will change the effective date above. Continuing to use the Service after changes take effect means you accept the updated terms.</p>
      </section>

      <section className="legal-section">
        <h2>13. Contact</h2>
        <p>Questions about these terms can be sent to {mail}.</p>
      </section>
    </main>
  );
}

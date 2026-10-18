import React, { lazy, Suspense, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ForumProvider } from './context/ForumContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import NotFound from './pages/NotFound';
import CategoryPage from './pages/CategoryPage';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import './index.css';
import Chatbot from './components/Chatbot';

// Home, PostDetail, CategoryPage and NotFound ship in the main bundle (they're
// the main entry pages from search). Every other page downloads its code on first visit.
const CreatePost = lazy(() => import('./pages/CreatePost'));
const Profile = lazy(() => import('./pages/Profile'));
const Health = lazy(() => import('./pages/Health'));
const Playground = lazy(() => import('./pages/Playground'));
const CaioCompass = lazy(() => import('./pages/CaioCompass'));
const Certifications = lazy(() => import('./pages/Certifications'));
const CertificationAdmin = lazy(() => import('./pages/CertificationAdmin'));
const PlaygroundCommunity = lazy(() => import('./pages/PlaygroundCommunity'));
const VendorPortfolio = lazy(() => import('./pages/VendorPortfolio'));
const VendorPortfolioProfiles = lazy(() => import('./pages/VendorPortfolioProfiles'));
const VendorPortfolioAnalysis = lazy(() => import('./pages/VendorPortfolioAnalysis'));
const BuildBuyDecision = lazy(() => import('./pages/BuildBuyDecision'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
//import { seedFirestore } from './seedFirestore';
// Inside App(), add this button temporarily:

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    
    <ForumProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Navbar />
        <Suspense fallback={<div className="route-loading" aria-busy="true" />}>
        <Routes>

          <Route path="/" element={<Home />} />
          <Route path="/post/:key" element={<PostDetail />} />
          <Route path="/post/:key/:titleSlug" element={<PostDetail />} />
          <Route path="/category/:category" element={<CategoryPage />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/health" element={<Health />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/playground/community" element={<PlaygroundCommunity />} />
          <Route path="/playground/vendor-portfolio" element={<VendorPortfolio />} />
          <Route path="/playground/vendor-portfolio/profiles" element={<VendorPortfolioProfiles />} />
          <Route path="/playground/vendor-portfolio/analysis" element={<VendorPortfolioAnalysis />} />
          <Route path="/playground/caio-compass" element={<CaioCompass />} />
          <Route path="/playground/build-vs-buy" element={<BuildBuyDecision />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/workspace/review-center" element={<CertificationAdmin />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
          
        </Routes>
        </Suspense>
        <Footer />
        <CookieConsent />
        <Chatbot />
        <Analytics />
        <SpeedInsights />
        {/* Your comment here 
        <button onClick={seedFirestore} style={{position:'fixed',bottom:20,right:20,zIndex:999,background:'red',color:'white',padding:'10px',borderRadius:'8px'}}>
        Seed DB
        </button>*/}
      </BrowserRouter>
    </ForumProvider>
  );
}

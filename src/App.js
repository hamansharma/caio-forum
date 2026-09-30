import React, { useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { ForumProvider } from './context/ForumContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import Health from './pages/Health';
import Playground from './pages/Playground';
import CaioCompass from './pages/CaioCompass';
import Certifications from './pages/Certifications';
import CertificationAdmin from './pages/CertificationAdmin';
import PlaygroundCommunity from './pages/PlaygroundCommunity';
import VendorPortfolio from './pages/VendorPortfolio';
import VendorPortfolioProfiles from './pages/VendorPortfolioProfiles';
import VendorPortfolioAnalysis from './pages/VendorPortfolioAnalysis';
import NotFound from './pages/NotFound';
import BuildBuyDecision from './pages/BuildBuyDecision';
import './index.css';
import Chatbot from './components/Chatbot';
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
        <Routes>

          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<PostDetail />} />
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
          <Route path="/certifications/admin" element={<CertificationAdmin />} />
          <Route path="*" element={<NotFound />} />
          
        </Routes>
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

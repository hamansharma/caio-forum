import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import './index.css';
import Chatbot from './components/Chatbot';
//import { seedFirestore } from './seedFirestore';
// Inside App(), add this button temporarily:


export default function App() {
  return (
    
    <ForumProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>

          <Route path="/" element={<Home />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/health" element={<Health />} />
          <Route path="/playground" element={<Playground />} />
          
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

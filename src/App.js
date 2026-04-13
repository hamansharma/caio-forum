import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ForumProvider } from './context/ForumContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PostDetail from './pages/PostDetail';
import CreatePost from './pages/CreatePost';
import './index.css';
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
        </Routes>
        {/* Your comment here 
        <button onClick={seedFirestore} style={{position:'fixed',bottom:20,right:20,zIndex:999,background:'red',color:'white',padding:'10px',borderRadius:'8px'}}>
        Seed DB
        </button>*/}
      </BrowserRouter>
    </ForumProvider>
  );
}
import React from 'react';
import ReactDOM from 'react-dom/client';
import './utils/pageData'; // read before React replaces the pre-rendered page
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
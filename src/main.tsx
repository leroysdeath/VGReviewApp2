import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);


// src/main.tsx or wherever you call it
fetch('/.netlify/functions/igdb-search', {
  method: 'POST'
})
  .then(res => res.json())
  .then(data => console.log('IGDB Data:', data))
  .catch(err => console.error(err));
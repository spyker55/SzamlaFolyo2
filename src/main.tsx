import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './app.css';

const gyoker = document.getElementById('root');

if (!gyoker) {
  throw new Error('Hiányzik a #root elem az index.html-ből.');
}

createRoot(gyoker).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

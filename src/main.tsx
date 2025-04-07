import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import SplashCursor from './firebase/SplashCursor.tsx'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
<SplashCursor />

    <App />
  </StrictMode>
);

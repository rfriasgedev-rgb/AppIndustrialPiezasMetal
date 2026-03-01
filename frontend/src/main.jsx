import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Los CSS de AdminLTE, Bootstrap, FontAwesome y Toastify
// se cargan desde CDN en index.html para evitar conflictos con Vite

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

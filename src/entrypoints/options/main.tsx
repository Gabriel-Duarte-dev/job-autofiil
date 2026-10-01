import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@/styles/globals.css';

document.documentElement.classList.add('h-full');
document.body.classList.add('m-0', 'min-h-full', 'bg-slate-50', 'antialiased');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

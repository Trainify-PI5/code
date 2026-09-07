import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext.tsx';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <GlobalErrorBoundary>
          <App />
        </GlobalErrorBoundary>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EbayStyleListing } from './index.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <EbayStyleListing />
  </StrictMode>
);

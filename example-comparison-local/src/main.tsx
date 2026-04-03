import React from 'react';
import {createRoot} from 'react-dom/client';
import {ComparisonLab} from './ComparisonLab';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ComparisonLab />
  </React.StrictMode>,
);

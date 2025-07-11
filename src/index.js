// src/index.js

import React from 'react';
import ReactDOM from 'react-dom/client';
// 1. Importa los estilos de Mantine
import '@mantine/core/styles.css';

// 2. Importa el MantineProvider
import { MantineProvider } from '@mantine/core';

import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* 3. Envuelve tu App con el Provider */}
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <App />
    </MantineProvider>
  </React.StrictMode>
);
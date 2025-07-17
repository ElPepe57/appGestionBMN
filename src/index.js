import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import App from './App';

// 1. (OBLIGATORIO) Importa los estilos base de Mantine para que los componentes funcionen.
import '@mantine/core/styles.css';

// 2. Importa tus estilos personalizados (con Tailwind) después de los de la librería.
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <MantineProvider>
      <App />
    </MantineProvider>
  </React.StrictMode>
);
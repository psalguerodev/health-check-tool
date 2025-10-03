import type { Metadata } from 'next';
import './globals.css';
import './styles/form-styles.css';
import { TestHistoryProvider } from './context/TestHistoryContext';
import { ParameterStoreProvider } from './context/ParameterStoreContext';
import { GlobalHistoryProvider } from './context/GlobalHistoryContext';

export const metadata: Metadata = {
  title: 'Health Check Tool - Pruebas de Conexión',
  description: 'Herramienta para probar conexiones a diferentes servicios',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <GlobalHistoryProvider>
          <TestHistoryProvider>
            <ParameterStoreProvider>{children}</ParameterStoreProvider>
          </TestHistoryProvider>
        </GlobalHistoryProvider>
      </body>
    </html>
  );
}

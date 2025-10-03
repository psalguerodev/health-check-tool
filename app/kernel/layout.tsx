import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kernel - Kubernetes Management',
  description:
    'Conecta y administra clusters de Kubernetes de AWS. Ejecuta comandos kubectl directamente.',
};

export default function KernelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}

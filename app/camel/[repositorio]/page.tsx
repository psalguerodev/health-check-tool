'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BlueprintAnalyzer from '../../components/BlueprintAnalyzer';
import HistorySidebar from '../../components/HistorySidebar';
import ChatSidebar from '../../components/ChatSidebar';

interface CamelBlueprintPageProps {
  params: {
    repositorio: string;
  };
}

export default function CamelBlueprintPage({
  params,
}: CamelBlueprintPageProps) {
  const router = useRouter();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleBack = () => {
    router.push('/camel');
  };

  return (
    <>
      <BlueprintAnalyzer
        serviceName={params.repositorio}
        onBack={handleBack}
        onHistoryOpen={() => setIsHistoryOpen(true)}
        onChatOpen={() => setIsChatOpen(true)}
      />

      {/* Sidebar de Historial */}
      <HistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyKey="camelHistory"
        showSectionFilter={true}
      />

      {/* Sidebar de Chat IA */}
      <ChatSidebar isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}

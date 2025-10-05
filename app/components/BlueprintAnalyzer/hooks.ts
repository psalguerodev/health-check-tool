import { useState, useEffect, useRef } from 'react';
import { BlueprintAnalysis } from './types';
import { BlueprintAnalysisService } from './analysisService';
import { countMatches, copyToClipboard } from './utils';
import { XmlOptimizationOptions } from './xmlOptimizer';

export const useBlueprintAnalysis = (serviceName: string) => {
  const [analysis, setAnalysis] = useState<BlueprintAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const analyzeBlueprint = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await BlueprintAnalysisService.analyzeBlueprint(
          serviceName
        );
        setAnalysis(result);
      } catch (err) {
        setError('Error al analizar el blueprint');
        console.error('Error analyzing blueprint:', err);
      } finally {
        setLoading(false);
      }
    };

    analyzeBlueprint();
  }, [serviceName]);

  return { analysis, loading, error };
};

export const useXmlSearch = (rawXml: string) => {
  const [xmlSearchTerm, setXmlSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const xmlContainerRef = useRef<HTMLDivElement>(null);

  // Función para scroll a la coincidencia actual
  const scrollToCurrentMatch = () => {
    if (xmlContainerRef.current && totalMatches > 0) {
      const currentMatchElements =
        xmlContainerRef.current.querySelectorAll('.current-match');
      if (currentMatchElements.length > 0) {
        const currentElement = currentMatchElements[0] as HTMLElement;
        currentElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    }
  };

  // Navegación de búsqueda
  const goToNextMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % totalMatches);
    }
  };

  const goToPreviousMatch = () => {
    if (totalMatches > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
    }
  };

  // Scroll automático cuando cambia la coincidencia actual
  useEffect(() => {
    if (totalMatches > 0) {
      // Pequeño delay para asegurar que el DOM se haya actualizado
      setTimeout(scrollToCurrentMatch, 100);
    }
  }, [currentMatchIndex, totalMatches]);

  // Manejo de teclado para navegación
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && totalMatches > 0) {
      e.preventDefault();
      goToNextMatch();
    }
  };

  // Actualizar contador de coincidencias cuando cambia el término de búsqueda
  useEffect(() => {
    if (xmlSearchTerm && xmlSearchTerm.length >= 3) {
      const matches = countMatches(rawXml, xmlSearchTerm);
      setTotalMatches(matches);
      setCurrentMatchIndex(0);
    } else {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
    }
  }, [xmlSearchTerm, rawXml]);

  return {
    xmlSearchTerm,
    setXmlSearchTerm,
    currentMatchIndex,
    totalMatches,
    xmlContainerRef,
    goToNextMatch,
    goToPreviousMatch,
    handleKeyDown,
  };
};

export const useClipboard = () => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboardWithFeedback = async (text: string) => {
    try {
      await copyToClipboard(text);
      setCopiedItem(text);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  return { copiedItem, copyToClipboardWithFeedback };
};

export const useSummary = (analysis: BlueprintAnalysis | null) => {
  const [summary, setSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string>('');
  const [summaryType, setSummaryType] = useState<'detailed' | 'compact'>(
    'detailed'
  );

  const generateSummary = async (
    additionalInstructions?: string,
    xmlOptimization?: XmlOptimizationOptions
  ) => {
    if (!analysis) return;

    setSummaryLoading(true);
    setSummaryError('');

    try {
      const { SummaryService } = await import('./summaryService');
      const result = await SummaryService.generateSummary(
        analysis,
        summaryType,
        additionalInstructions,
        xmlOptimization
      );
      setSummary(result);
    } catch (error) {
      console.error('Error al generar resumen:', error);
      setSummaryError(
        `Error al generar el resumen: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const clearSummaryError = () => {
    setSummaryError('');
    setSummary('');
  };

  return {
    summary,
    summaryLoading,
    summaryError,
    summaryType,
    setSummaryType,
    generateSummary,
    clearSummaryError,
  };
};

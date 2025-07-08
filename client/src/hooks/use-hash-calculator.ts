import { useState, useCallback, useRef } from 'react';
import { HashCalculator, CalculationParams, HashSolution, CalculationProgress } from '@/lib/hash-calculator';

export function useHashCalculator() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [solutions, setSolutions] = useState<HashSolution[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [rate, setRate] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const calculatorRef = useRef<HashCalculator | null>(null);

  const onProgressUpdate = useCallback((progressData: CalculationProgress) => {
    setProgress(progressData.progress);
    setSolutions(progressData.solutions);
    setAttempts(progressData.attempts);
    setRate(progressData.rate);
    setElapsedTime(progressData.elapsedTime);
  }, []);

  const startCalculation = useCallback(async (params: CalculationParams) => {
    if (isCalculating) return;

    setIsCalculating(true);
    setProgress(0);
    setSolutions([]);
    setAttempts(0);
    setRate(0);
    setElapsedTime(0);

    calculatorRef.current = new HashCalculator(onProgressUpdate);
    
    try {
      await calculatorRef.current.startCalculation(params);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [isCalculating, onProgressUpdate]);

  const stopCalculation = useCallback(() => {
    if (calculatorRef.current) {
      calculatorRef.current.stopCalculation();
    }
    setIsCalculating(false);
  }, []);

  const clearResults = useCallback(() => {
    setSolutions([]);
    setProgress(0);
    setAttempts(0);
    setRate(0);
    setElapsedTime(0);
  }, []);

  const exportResults = useCallback(() => {
    if (solutions.length === 0) return;

    const data = {
      timestamp: new Date().toISOString(),
      solutions: solutions.map(solution => ({
        inputValue: solution.inputValue,
        calculatedHash: solution.calculatedHash,
        hashValue: solution.hashValue,
        isValid: solution.isValid
      })),
      statistics: {
        totalAttempts: attempts,
        solutionsFound: solutions.length,
        calculationRate: rate,
        elapsedTime: elapsedTime
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hashtoken-solutions-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [solutions, attempts, rate, elapsedTime]);

  return {
    isCalculating,
    progress,
    solutions,
    attempts,
    rate,
    elapsedTime,
    startCalculation,
    stopCalculation,
    clearResults,
    exportResults
  };
}

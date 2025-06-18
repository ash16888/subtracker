import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface GenerateInsightsButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const GenerateInsightsButton: React.FC<GenerateInsightsButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Генерируем инсайты...
        </>
      ) : (
        <>
          <SparklesIcon className="h-4 w-4" />
          Генерировать инсайты
        </>
      )}
    </button>
  );
};
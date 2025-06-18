import React from 'react';
import type { AIInsight } from '../types/insights';
import { 
  LightBulbIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  DocumentDuplicateIcon,
  TagIcon
} from '@heroicons/react/24/outline';

interface InsightCardProps {
  insight: AIInsight;
}

const getInsightIcon = (type: AIInsight['type']) => {
  switch (type) {
    case 'optimization':
      return <LightBulbIcon className="h-5 w-5" />;
    case 'duplicate':
      return <DocumentDuplicateIcon className="h-5 w-5" />;
    case 'warning':
      return <ExclamationTriangleIcon className="h-5 w-5" />;
    case 'trend':
      return <ChartBarIcon className="h-5 w-5" />;
    case 'forecast':
      return <CurrencyDollarIcon className="h-5 w-5" />;
    case 'category':
      return <TagIcon className="h-5 w-5" />;
  }
};

const getPriorityColor = (priority: AIInsight['priority']) => {
  switch (priority) {
    case 'high':
      return 'border-red-200 bg-red-50';
    case 'medium':
      return 'border-yellow-200 bg-yellow-50';
    case 'low':
      return 'border-green-200 bg-green-50';
  }
};

const getIconColor = (type: AIInsight['type']) => {
  switch (type) {
    case 'optimization':
      return 'text-blue-600';
    case 'duplicate':
      return 'text-purple-600';
    case 'warning':
      return 'text-red-600';
    case 'trend':
      return 'text-indigo-600';
    case 'forecast':
      return 'text-green-600';
    case 'category':
      return 'text-orange-600';
  }
};

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  return (
    <div className={`rounded-lg border p-4 ${getPriorityColor(insight.priority)}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${getIconColor(insight.type)}`}>
          {getInsightIcon(insight.type)}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{insight.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{insight.description}</p>
          
          {insight.actionItems && insight.actionItems.length > 0 && (
            <ul className="mt-3 space-y-1">
              {insight.actionItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-gray-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          
          {insight.potentialSavings && (
            <div className="mt-3 inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              Экономия: {insight.potentialSavings} ₽/мес
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiService } from '../../../services/aiService';
import type { GenerateInsightsRequest, AIInsight } from '../types/insights';

const INSIGHTS_CACHE_KEY = 'ai-insights';
const INSIGHTS_CACHE_TIME = 1000 * 60 * 30; // 30 минут

export const useAIInsights = () => {
  const queryClient = useQueryClient();

  const {
    data: insights = [],
    isLoading: isLoadingInsights,
    error: insightsError
  } = useQuery({
    queryKey: [INSIGHTS_CACHE_KEY],
    queryFn: () => {
      const cached = localStorage.getItem(INSIGHTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const isExpired = new Date().getTime() - new Date(parsed.timestamp).getTime() > INSIGHTS_CACHE_TIME;
        if (!isExpired) {
          return parsed.insights.map((insight: any) => ({
            ...insight,
            createdAt: new Date(insight.createdAt)
          }));
        }
      }
      return [];
    },
    staleTime: INSIGHTS_CACHE_TIME
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async (request: GenerateInsightsRequest) => {
      const response = await aiService.generateInsights(request);
      
      localStorage.setItem(INSIGHTS_CACHE_KEY, JSON.stringify({
        insights: response.insights,
        timestamp: response.generatedAt
      }));
      
      return response.insights;
    },
    onSuccess: (insights: AIInsight[]) => {
      queryClient.setQueryData([INSIGHTS_CACHE_KEY], insights);
    },
    onError: (error) => {
      console.error('Failed to generate insights:', error);
    }
  });

  const clearInsights = () => {
    localStorage.removeItem(INSIGHTS_CACHE_KEY);
    queryClient.setQueryData([INSIGHTS_CACHE_KEY], []);
  };

  return {
    insights,
    isLoadingInsights,
    insightsError,
    generateInsights: generateInsightsMutation.mutate,
    isGenerating: generateInsightsMutation.isPending,
    generateError: generateInsightsMutation.error,
    clearInsights
  };
};
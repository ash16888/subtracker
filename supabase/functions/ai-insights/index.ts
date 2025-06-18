// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { subscriptions, userId } = await req.json()

    // Выберите один из AI провайдеров:

    // ВАРИАНТ 1: OpenAI GPT-4
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Ты финансовый аналитик, специализирующийся на анализе подписок. Проанализируй подписки пользователя и дай конкретные рекомендации по оптимизации.'
          },
          {
            role: 'user',
            content: generatePrompt(subscriptions)
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })


    const aiResult = await openaiResponse.json()
    const insights = parseAIResponse(aiResult.choices[0].message.content)

    return new Response(
      JSON.stringify({ insights, generatedAt: new Date() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

function generatePrompt(subscriptions: any[]) {
  const totalMonthly = subscriptions.reduce((sum, sub) => {
    return sum + (sub.billing_period === 'yearly' ? sub.amount / 12 : sub.amount)
  }, 0)

  return `
Проанализируй следующие подписки пользователя и предоставь инсайты:

ПОДПИСКИ:
${subscriptions.map(sub => `
- ${sub.name}: ${sub.amount} ${sub.currency}/${sub.billing_period}
- Категория: ${sub.category || 'Не указана'}
- Следующий платеж: ${sub.next_payment_date}
`).join('\n')}

ОБЩАЯ СУММА В МЕСЯЦ: ${Math.round(totalMonthly)} ₽

Предоставь анализ в формате JSON со следующими типами инсайтов:
- optimization: рекомендации по экономии
- duplicate: возможные дубликаты функциональности
- warning: предупреждения о расходах
- forecast: прогнозы
- category: анализ по категориям
- recommendation: рекомендации о добавлении или замене подписок

Для каждого инсайта укажи:
- type: тип инсайта
- priority: 'high' | 'medium' | 'low'
- title: краткий заголовок
- description: подробное описание
- actionItems: массив конкретных действий
- potentialSavings: потенциальная экономия в рублях/месяц (если применимо)
- affectedSubscriptions: список затронутых подписок

Отвечай только JSON без дополнительного текста.
  `
}

function parseAIResponse(response: string) {
  try {
    const insights = JSON.parse(response)
    return insights.map((insight: any, index: number) => ({
      ...insight,
      id: `ai-${index}`,
      createdAt: new Date()
    }))
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    return []
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ai-insights' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

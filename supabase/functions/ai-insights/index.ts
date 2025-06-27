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

    const { subscriptions } = await req.json()

    // Выберите один из AI провайдеров:

    // ВАРИАНТ 1: OpenAI GPT-4
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'o3',
        messages: [
          {
            role: 'user',
            content: generatePrompt(subscriptions)
          }
        ],
        max_completion_tokens: 10000,
        reasoning_effort: 'medium'
      })
    })


    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI API error:', openaiResponse.status, errorData)
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData}`)
    }

    const aiResult = await openaiResponse.json()
    
    console.log('OpenAI API response status:', openaiResponse.status)
    console.log('Full AI result:', JSON.stringify(aiResult, null, 2))
    
    // Проверяем разные возможные структуры ответа для o4-mini
    let content = null
    const choice = aiResult.choices?.[0]
    const message = choice?.message
    
    console.log('Finish reason:', choice?.finish_reason)
    console.log('Usage details:', JSON.stringify(aiResult.usage, null, 2))
    
    // Проверяем, есть ли отказ от модели
    if (message?.refusal) {
      console.error('Model refused to answer:', message.refusal)
      throw new Error(`Model refused: ${message.refusal}`)
    }
    
    // Проверяем finish_reason для диагностики
    if (choice?.finish_reason === 'length') {
      console.error('Response was cut off due to token limit')
      throw new Error('Response truncated due to token limit - try reducing input size')
    }
    
    if (message?.content) {
      content = message.content
    } else if (choice?.text) {
      content = choice.text
    } else if (aiResult.content) {
      content = aiResult.content
    } else if (aiResult.text) {
      content = aiResult.text
    }
    
    if (!content) {
      console.error('No content found in AI response. Available keys:', Object.keys(aiResult))
      if (choice) {
        console.error('Choice structure:', Object.keys(choice))
        if (message) {
          console.error('Message structure:', Object.keys(message))
          console.error('Message content:', message.content)
          console.error('Message refusal:', message.refusal)
        }
      }
      throw new Error('Invalid AI response format - no content found')
    }
    
    console.log('Raw AI response:', String(content).substring(0, 500) + '...')
    
    const insights = parseAIResponse(String(content))

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

function generatePrompt(subscriptions: Record<string, unknown>[]) {
  const totalMonthly = subscriptions.reduce((sum, sub) => {
    const amount = Number(sub.amount) || 0
    return sum + (sub.billing_period === 'yearly' ? amount / 12 : amount)
  }, 0)

  const categories = [...new Set(subscriptions.map(sub => sub.category).filter(Boolean))]

  return `
Ты персональный финансовый консультант. Проанализируй подписки пользователя и напиши дружелюбный анализ в виде связного текста, органично включив в него все инсайты и рекомендации.

ПОДПИСКИ ПОЛЬЗОВАТЕЛЯ:
${subscriptions.map(sub => `
🔹 ${sub.name}: ${sub.amount} ${sub.currency}/${sub.billing_period}
   Категория: ${sub.category || 'Не указана'}
   Следующий платеж: ${sub.next_payment_date}
`).join('\n')}

ОБЩАЯ СУММА В МЕСЯЦ: ${Math.round(totalMonthly)} ₽
КАТЕГОРИИ: ${categories.join(', ') || 'Не указаны'}

СТРУКТУРА ОТВЕТА:
Напиши связный текстовый анализ, который включает:

1. ПРИВЕТСТВИЕ И АНАЛИЗ ИНТЕРЕСОВ (1-2 абзаца)
   - Похвали выбор пользователя, отметь интересные сервисы
   - Проанализируй его цифровые привычки на основе подписок
   - Ненавязчиво отметь общую картину расходов

2. ОСНОВНОЙ АНАЛИЗ (2-3 абзаца)
   - Органично включи возможности оптимизации и экономии
   - Отметь возможные дубликаты функциональности
   - Дай практические советы по управлению подписками
   - Укажи конкретные суммы потенциальной экономии где применимо

3. РЕКОМЕНДАЦИИ И ЗАКЛЮЧЕНИЕ (1-2 абзаца)
   - Блок "Возможно, вам были бы интересны" с персонализированными предложениями
   - Общие советы по управлению подписками
   - Позитивное заключение

Верни результат в формате JSON:
{
  "analysis": "полный текстовый анализ в виде связного текста с абзацами",
  "totalSavings": число_потенциальной_экономии_в_месяц,
  "keyRecommendations": ["короткий совет 1", "короткий совет 2", "короткий совет 3"]
}

ТОН: Дружелюбный, персональный, как опытный друг. Используй эмодзи для акцентов. Пиши естественно, избегай списков и формальных структур.

ВАЖНО: Отвечай ТОЛЬКО валидным JSON без markdown блоков.
  `
}

function parseAIResponse(response: string) {
  try {
    // Очищаем ответ от markdown блоков и лишних символов
    let cleanResponse = response.trim()
    
    // Удаляем markdown блоки ```json и ```
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    // Удаляем возможные лишние символы в начале и конце
    cleanResponse = cleanResponse.trim()
    
    console.log('Cleaned AI response:', cleanResponse.substring(0, 200) + '...')
    
    const aiResult = JSON.parse(cleanResponse)
    
    // Преобразуем новый формат в старый для совместимости с фронтендом
    const analysisInsight = {
      id: `ai-analysis-${Date.now()}`,
      type: 'analysis',
      priority: 'high',
      title: '📊 Персональный анализ ваших подписок',
      description: aiResult.analysis || 'Анализ подписок',
      actionItems: aiResult.keyRecommendations || [],
      potentialSavings: aiResult.totalSavings || 0,
      affectedSubscriptions: [],
      createdAt: new Date()
    }
    
    return [analysisInsight]
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    console.error('Raw response:', response)
    
    // Возвращаем базовый инсайт при ошибке парсинга
    return [{
      id: `fallback-${Date.now()}`,
      type: 'warning',
      priority: 'medium',
      title: 'Анализ временно недоступен',
      description: 'Не удалось обработать ответ AI. Попробуйте позже.',
      actionItems: ['Повторите запрос через несколько минут'],
      createdAt: new Date()
    }]
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

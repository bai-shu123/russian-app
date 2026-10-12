import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

function extractOutputText(result: any) {
  return result.output_text || result.output?.flatMap((item: any) => item.content || []).map((item: any) => item.text || '').join('') || ''
}

function parseJudgement(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const judgement = JSON.parse(cleaned)
  if (!['correct', 'partial', 'wrong', 'unknown'].includes(judgement?.verdict)) throw new Error('invalid_verdict')
  return { verdict: judgement.verdict, explanation: String(judgement.explanation || '') }
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return response({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  const openaiBaseUrl = (Deno.env.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const openaiModel = Deno.env.get('OPENAI_JUDGE_MODEL') || 'gpt-5.5'
  if (!openaiKey) return response({ verdict: 'pending', explanation: 'AI 服务尚未配置。' }, 503)

  const admin = createClient(supabaseUrl, serviceKey)
  const auth = request.headers.get('Authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '')
  const { data: userData } = await admin.auth.getUser(token)
  if (!userData.user) return response({ error: 'unauthorized' }, 401)

  const body = await request.json()
  const answer = String(body.answer || '').trim()
  const prompt = String(body.prompt || '')
  const reference = String(body.reference || '')
  if (!answer || !reference) return response({ verdict: 'unknown', explanation: '缺少作答或参考答案。' }, 400)

  const { data: limit } = await admin.from('training_ai_limits').select('*').eq('id', true).maybeSingle()
  if (limit && !limit.enabled) return response({ verdict: 'pending', explanation: 'AI 复核已暂时关闭。' }, 429)

  const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
  const isAdmin = profile?.role === 'admin'
  if (!isAdmin) {
    const dailyLimit = 50
    const since = new Date(); since.setUTCHours(0, 0, 0, 0)
    const { count } = await admin.from('training_ai_reviews').select('id', { count: 'exact', head: true }).eq('user_id', userData.user.id).gte('created_at', since.toISOString())
    if ((count || 0) >= dailyLimit) return response({ verdict: 'pending', explanation: '今日 AI 复核额度已用完（每天最多 50 次）。' }, 429)
  }

  const input = `你是俄语教师。判断学习者答案是否表达了与参考答案相同的意思。只考虑语法、词形、拼写、搭配和语义，不因为大小写、标点、空格或 е/ё 差异判错。只输出 JSON，不要使用 Markdown，格式为 {"verdict":"correct|partial|wrong|unknown","explanation":"简短中文说明"}。\n中文题目：${prompt}\n参考答案：${reference}\n学习者答案：${answer}`
  const headers = { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' }
  const schema = { type: 'object', properties: { verdict: { type: 'string', enum: ['correct', 'partial', 'wrong', 'unknown'] }, explanation: { type: 'string' } }, required: ['verdict', 'explanation'], additionalProperties: false }

  let upstream = await fetch(`${openaiBaseUrl}/responses`, {
    method: 'POST', headers,
    body: JSON.stringify({ model: openaiModel, input, text: { format: { type: 'json_schema', name: 'answer_judgement', strict: true, schema } }, max_output_tokens: 180 })
  })

  // 部分 OpenAI 兼容中转站支持 Responses API，但不支持 text.format；遇到参数错误时自动降级。
  if (!upstream.ok && [400, 404, 422].includes(upstream.status)) {
    const firstError = await upstream.text()
    console.warn('Structured AI review failed; retrying without text.format', upstream.status, firstError.slice(0, 1000))
    upstream = await fetch(`${openaiBaseUrl}/responses`, {
      method: 'POST', headers,
      body: JSON.stringify({ model: openaiModel, input, max_output_tokens: 180 })
    })
  }

  if (!upstream.ok) {
    const errorText = await upstream.text()
    console.error('AI review upstream error', upstream.status, errorText.slice(0, 1000))
    const hint = upstream.status === 401 || upstream.status === 403
      ? '中转站密钥无效或无权使用该模型。'
      : upstream.status === 429
        ? '中转站额度不足或请求过于频繁。'
        : `中转站返回错误（${upstream.status}）。`
    return response({ verdict: 'pending', explanation: `${hint}本次答案已进入待复核，不降低掌握度。` }, 503)
  }

  const result = await upstream.json()
  let judgement: any
  try { judgement = parseJudgement(extractOutputText(result)) } catch (error) {
    console.error('AI review parse error', String(error), JSON.stringify(result).slice(0, 1500))
    return response({ verdict: 'pending', explanation: 'AI 返回格式异常，已保留为待复核。' }, 503)
  }
  await admin.from('training_ai_reviews').upsert({ user_id: userData.user.id, exercise_id: String(body.exerciseId || ''), normalized_answer: answer.toLowerCase(), verdict: judgement.verdict, explanation: judgement.explanation || '', provider: 'openai-compatible', model: openaiModel, estimated_cost: 0.002 }, { onConflict: 'user_id,exercise_id,normalized_answer' })
  return response(judgement)
})


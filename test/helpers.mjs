import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../index.js'

/** Point the summary store at a fresh directory for one test. */
export function isolateHome() {
  process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'dsh-workbench-test-'))
  return process.env.DSH_HOME
}

/**
 * A scripted llm service: every call yields one text chunk, and the script may
 * answer per call or derive the answer from the prompt.
 */
export function makeLlm(answer) {
  const calls = []
  const llm = {
    listProviders: async () => [{ id: 'mock' }],
    listModels: async () => [{ id: 'mock-model' }],
    stream: async function* (options) {
      const prompt = options?.messages?.[0]?.content?.[0]?.text ?? ''
      calls.push({ prompt, provider: options?.provider, model: options?.model })
      const text = typeof answer === 'function' ? answer(prompt, calls.length - 1) : answer
      yield { type: 'text-delta', index: 0, text }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
  return { llm, calls }
}

export function makeHarness({ sessions, llm, account } = {}) {
  const routes = []
  const items = sessions.map((session) => ({
    sessionId: session.id,
    cwd: session.cwd,
    updatedAt: session.updatedAt ?? Date.now(),
    running: session.running === true,
    blank: false,
    origin: 'user',
  }))
  const events = new Map(sessions.map((session) => [session.id, session.events]))
  const ctx = {
    effect: (fn) => fn(),
    get: (name) => (name === 'llm' ? llm : name === 'deepseekAccount' ? account : undefined),
    connection: { fetch: { register: (route) => routes.push(route) } },
    sessionController: {
      list: async () => ({ items }),
      inspect: async (sessionId) => ({ inheritedEventCount: 0, events: events.get(sessionId) ?? [] }),
    },
  }
  apply(ctx, {})
  return { routes }
}

export async function status(routes, { now, tzOffset = 28800, locale = 'zh' } = {}) {
  const realNow = Date.now
  if (Number.isFinite(now)) Date.now = () => now
  try {
    const response = await routes[0].fetch(
      new Request(`http://local/api/workbench/status?tzOffset=${tzOffset}&locale=${locale}`),
    )
    return await response.json()
  } finally {
    Date.now = realNow
  }
}

export async function summarize(routes, body) {
  const response = await routes[1].fetch(
    new Request('http://local/api/workbench/summarize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tzOffset: 28800, locale: 'zh', ...body }),
    }),
  )
  return { status: response.status, body: await response.json() }
}

/** A user message plus a model route, enough for the summary material. */
export function sessionMaterial({ id = 's1', cwd = '/work/proj', start, title = 'Build the thing' } = {}) {
  return [
    { type: 'session/title', time: start, data: { title } },
    {
      type: 'user/message',
      time: start + 1000,
      data: { source: { kind: 'user' }, content: [{ type: 'text', text: 'Build the thing' }] },
    },
    { type: 'request/context', time: start + 1000, data: { provider: 'mock', model: 'mock-model' } },
    {
      type: 'assistant/message',
      time: start + 2000,
      data: { turn: 1, step: 1, usage: { inputTokens: 100, outputTokens: 50 }, message: { source: { model: 'mock-model' }, content: [{ type: 'text', text: 'I fixed the thing.' }] } },
    },
  ]
}

export function localDayStart(now, tzOffset = 28800) {
  return Math.floor((now + tzOffset * 1000) / 86_400_000) * 86_400_000 - tzOffset * 1000
}

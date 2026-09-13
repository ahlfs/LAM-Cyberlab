import { createFileRoute } from '@tanstack/react-router'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
} from '../../../server/rate-limit'
import { openaiChat } from '../../../server/openai-compat-api'

export const Route = createFileRoute('/api/study/analyze')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const ip = getClientIp(request)
        if (!rateLimit(`study-analyze:${ip}`, 20, 60_000)) {
          return rateLimitResponse()
        }

        try {
          const body = (await request.json().catch(() => ({}))) as {
            content?: string
            title?: string
            instructions?: string
          }

          if (!body.content || typeof body.content !== 'string') {
            return new Response(
              JSON.stringify({ ok: false, error: 'Document content is required.' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }

          const systemPrompt = `You are the Hermes Second Brain Learning Agent.
Analyze the following resource thoroughly and provide structured, high-value knowledge extraction.

Format your response cleanly in Markdown:
1. **Executive Summary** (2-3 crisp sentences capturing the core thesis)
2. **Core Concepts & Definitions** (Detailed definitions, key mechanisms, and suggested Obsidian Wikilinks like [[Concept Name]])
3. **Key Takeaways & Heuristics** (Actionable insights, architectural patterns, or mental models)
4. **Second Brain Connections** (How this relates to broader domains)

Resource Title: ${body.title || 'Untitled Document'}
User Instructions: ${body.instructions || 'Perform comprehensive concept extraction.'}

Resource Content:
${body.content.slice(0, 30000)}`

          const streamResult = await openaiChat(
            [{ role: 'user', content: systemPrompt }],
            { stream: true },
          )

          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            async start(controller) {
              try {
                for await (const chunk of streamResult) {
                  if (chunk.type === 'content' && chunk.text) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          event: 'text_delta',
                          data: { text: chunk.text },
                        })}\n\n`,
                      ),
                    )
                  }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
              } catch (streamError: any) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      event: 'error',
                      data: { message: streamError?.message || 'Streaming failed' },
                    })}\n\n`,
                  ),
                )
                controller.close()
              }
            },
          })

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
            },
          })
        } catch (error: any) {
          return new Response(
            JSON.stringify({ ok: false, error: error?.message || 'Server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
          )
        }
      },
    },
  },
})

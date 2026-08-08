import { openaiChat } from './src/server/openai-compat-api.ts';
async function run() {
  try {
    const stream = await openaiChat([{ role: 'user', content: 'hi' }], {
      model: 'tamandata/cx/gpt-5.4-mini',
      baseUrl: 'http://localhost:20128/v1',
      apiKey: 'sk-bb7ffcb1f7fd0662-wg7ld4-66efd449',
      stream: true,
      sessionId: 'test'
    });
    for await (const chunk of stream) {
      console.log(chunk);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
run();

const OpenAI = require('openai').default;

const client = new OpenAI({
  apiKey: 'sk-f4598216dcf44e3b91620a5f2c6011ba',
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
});

async function test() {
  try {
    console.log('Starting Qwen test...');
    const response = await client.chat.completions.create({
      model: 'qwen3.5-plus',
      max_tokens: 100,
      temperature: 0.4,
      messages: [
        { role: 'system', content: 'Du bist hilfreich.' },
        { role: 'user', content: 'Hallo, wer bist du?' },
      ],
    });
    console.log('Success:', response.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Status:', error.status);
  }
}

test();

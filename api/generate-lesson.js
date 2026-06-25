export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, lessonNumber, prevTopics } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Missing topic' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const prompt = `You are a world-class communication coach creating a micro-lesson for a 15-day "Speak Eloquently" course.

Previously covered topics: ${prevTopics || 'none'}

Now create lesson ${lessonNumber || ''} on the topic: "${topic}"

Return ONLY valid JSON — no markdown, no backticks, no explanation. Schema:
{
  "topic": "short topic label (2-4 words)",
  "title": "compelling lesson title using HTML — wrap ONE key phrase in <em> tags, use <br> for line break",
  "body": "3-4 sentences. Practical, direct coaching insight. No fluff. Generic — works for any adult learner.",
  "phrase": "one practice sentence in double quotes the learner will say aloud",
  "guide": "one sentence coaching instruction for how to deliver the phrase",
  "tip": "short tip heading (3-5 words)",
  "tipBody": "2 sentences explaining the psychology or science behind why this technique works"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Anthropic API error', detail: err });
    }

    const data = await response.json();
    const raw = data.content.find(b => b.type === 'text')?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const lesson = JSON.parse(clean);

    return res.status(200).json(lesson);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

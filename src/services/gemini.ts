// ─── Provider Config ─────────────────────────────────────────
export type AIProvider = 'gemini' | 'deepseek';

export function getProvider(): AIProvider {
  return (localStorage.getItem('ai_provider') as AIProvider) || 'gemini';
}
export function setProvider(p: AIProvider) {
  localStorage.setItem('ai_provider', p);
}

export function getApiKey(): string | null {
  return localStorage.getItem(`${getProvider()}_api_key`);
}
export function setApiKey(key: string) {
  localStorage.setItem(`${getProvider()}_api_key`, key);
}

export function getModel(): string {
  const saved = localStorage.getItem(`${getProvider()}_model`);
  if (saved) return saved;
  return getProvider() === 'gemini' ? 'gemini-2.0-flash-lite' : 'deepseek-chat';
}
export function setModel(model: string) {
  localStorage.setItem(`${getProvider()}_model`, model);
}

// ─── AI Status Event System ──────────────────────────────────
type AIStatusListener = (status: AIStatus) => void;
export interface AIStatus {
  state: 'idle' | 'pending' | 'success' | 'error' | 'retrying';
  message: string;
  detail?: string;
  timestamp: number;
}

const listeners: Set<AIStatusListener> = new Set();
let currentStatus: AIStatus = { state: 'idle', message: '', timestamp: Date.now() };

export function onAIStatus(fn: AIStatusListener) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
export function getAIStatus() { return currentStatus; }

function emitStatus(status: AIStatus) {
  currentStatus = status;
  listeners.forEach((fn) => fn(status));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Provider-specific fetch ─────────────────────────────────

function buildGeminiFetch(apiKey: string, model: string, body: Record<string, unknown>) {
  const ver = model.startsWith('gemini-1.5') ? 'v1' : 'v1beta';
  return {
    url: `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${apiKey}`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    } as RequestInit,
    parseResponse: (data: Record<string, unknown>) => {
      const candidates = data.candidates as Array<{ content: { parts: Array<{ text: string }> } }> | undefined;
      return candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    },
  };
}

function buildDeepseekFetch(apiKey: string, model: string, prompt: string, systemPrompt?: string, maxTokens = 4096) {
  const messages: { role: string; content: string }[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  return {
    url: 'https://api.deepseek.com/v1/chat/completions',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4 }),
    } as RequestInit,
    parseResponse: (data: Record<string, unknown>) => {
      const choices = data.choices as Array<{ message: { content: string } }> | undefined;
      return choices?.[0]?.message?.content ?? '';
    },
  };
}

// ─── Core API Call ───────────────────────────────────────────

export async function callGemini(
  prompt: string,
  systemPrompt?: string,
  maxTokens = 4096,
): Promise<string> {
  const provider = getProvider();
  const apiKey = getApiKey();
  if (!apiKey) throw new Error(`API key not set for ${provider}. Go to Settings to configure.`);

  const model = getModel();
  emitStatus({ state: 'pending', message: `Calling ${model} (${provider})...`, timestamp: Date.now() });

  let fetchConfig: { url: string; init: RequestInit; parseResponse: (d: Record<string, unknown>) => string };

  if (provider === 'deepseek') {
    fetchConfig = buildDeepseekFetch(apiKey, model, prompt, systemPrompt, maxTokens);
  } else {
    const body: Record<string, unknown> = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
    };
    if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };
    fetchConfig = buildGeminiFetch(apiKey, model, body);
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(fetchConfig.url, fetchConfig.init);

      if (res.ok) {
        const data = await res.json();
        const text = fetchConfig.parseResponse(data);
        emitStatus({
          state: 'success',
          message: `Response from ${model}`,
          detail: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
          timestamp: Date.now(),
        });
        return text;
      }

      if (res.status === 429) {
        const waitSec = (attempt + 1) * 5;
        emitStatus({ state: 'retrying', message: `Rate limited — retrying in ${waitSec}s (${attempt + 1}/5)`, timestamp: Date.now() });
        await sleep(waitSec * 1000);
        continue;
      }

      const errBody = await res.text();
      emitStatus({ state: 'error', message: `API error (${res.status})`, detail: errBody.slice(0, 300), timestamp: Date.now() });
      throw new Error(`${provider} API error (${res.status}): ${errBody.slice(0, 200)}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes('API error')) throw err;
      const waitSec = (attempt + 1) * 3;
      emitStatus({ state: 'retrying', message: `Network error — retrying in ${waitSec}s`, detail: err instanceof Error ? err.message : '', timestamp: Date.now() });
      await sleep(waitSec * 1000);
    }
  }

  emitStatus({ state: 'error', message: 'All retries exhausted', timestamp: Date.now() });
  throw new Error('API is rate-limited. Please wait and try again.');
}

// ─── Prompt functions (unchanged) ────────────────────────────

function chunkText(text: string, maxChars = 2000): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

const VOCAB_PROMPT = (text: string) =>
`You are an expert English language teacher. From the text below, extract ALL meaningful vocabulary words and phrases.

Include ALL types:
- Nouns, verbs, adjectives, adverbs
- Phrasal verbs (e.g. "wade through", "carry out")
- Idioms and fixed expressions
- Collocations (e.g. "prompt attention", "rushed answer")
- Technical/domain-specific terms

Extract as many words as possible. Include words of ALL CEFR levels (A1 to C2), not only difficult ones.
Return ONLY a JSON array, no other text:
[{"word": "", "pos": "noun|verb|adj|adv|phrasal verb|phrase|idiom", "cefr": "A1|A2|B1|B2|C1|C2", "phonetic": "", "meaning_vi": "", "meaning_en": "", "context_in_text": "", "context_real_world": "", "collocations": [], "synonyms": [], "antonyms": [], "word_family": [], "related_words": [], "example_from_text": "", "example_real": "", "tags": []}]

Text:
${text}`;

export async function extractVocabulary(text: string): Promise<string> {
  const chunks = chunkText(text, 2000);

  if (chunks.length === 1) {
    emitStatus({ state: 'pending', message: 'Extracting vocabulary...', timestamp: Date.now() });
    return callGemini(VOCAB_PROMPT(text), undefined, 8192);
  }

  // Multiple chunks — process sequentially and merge JSON arrays
  const allResults: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    emitStatus({
      state: 'pending',
      message: `Extracting vocabulary (chunk ${i + 1}/${chunks.length})...`,
      timestamp: Date.now(),
    });
    const result = await callGemini(VOCAB_PROMPT(chunks[i]), undefined, 8192);
    allResults.push(result);
  }

  // Merge all JSON arrays into one
  const merged: unknown[] = [];
  const seenWords = new Set<string>();

  for (const raw of allResults) {
    try {
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const arr = JSON.parse(jsonMatch[0]);
        for (const item of arr) {
          const key = String(item.word || '').toLowerCase().trim();
          if (key && !seenWords.has(key)) {
            seenWords.add(key);
            merged.push(item);
          }
        }
      }
    } catch {
      // fallback: extract individual objects
      const objectRegex = /\{[^{}]*"word"\s*:[^{}]*\}/g;
      const matches = raw.match(objectRegex);
      if (matches) {
        for (const m of matches) {
          try {
            const item = JSON.parse(m);
            const key = String(item.word || '').toLowerCase().trim();
            if (key && !seenWords.has(key)) {
              seenWords.add(key);
              merged.push(item);
            }
          } catch { /* skip */ }
        }
      }
    }
  }

  return JSON.stringify(merged);
}

export async function extractSingleWord(word: string, context: string): Promise<string> {
  emitStatus({ state: 'pending', message: `Looking up "${word}"...`, timestamp: Date.now() });
  return callGemini(
`You are an expert English language teacher. Extract the meaning and details for the word "${word}" given the following context sentence/paragraph it appears in:
Context: "${context}"

Return ONLY a single JSON object (not an array), no other text. Use this exact format:
{"word": "${word.toLowerCase()}", "pos": "noun|verb|adj|adv|phrasal verb|phrase|idiom", "cefr": "A1|A2|B1|B2|C1|C2", "phonetic": "", "meaning_vi": "", "meaning_en": "", "context_in_text": "Quote the context phrase where it appears", "context_real_world": "", "collocations": [], "synonyms": [], "antonyms": [], "word_family": [], "related_words": [], "example_from_text": "The sentence from the context", "example_real": "A common real-world example", "tags": []}`
  );
}

export async function explainWord(word: string, pos: string, context?: string): Promise<string> {
  return callGemini(`Giải thích từ "${word}" (${pos}) chi tiết cho học viên B1-B2:
1. Nghĩa chính (tiếng Việt) 2. Nghĩa trong ngữ cảnh: "${context || 'general'}"
3. Collocations (3-5) 4. Phân biệt từ dễ nhầm 5. 2 ví dụ câu. Trả lời bằng tiếng Việt.`);
}

export async function gradeTranslation(original: string, translation: string): Promise<string> {
  return callGemini(`Câu gốc: ${original}\nBản dịch: ${translation}\n\nChấm 3 tiêu chí (0-10): Chính xác nghĩa, Tự nhiên, Ngữ pháp. Chỉ 1-2 lỗi và gợi ý sửa. Dưới 100 từ.`);
}

export async function generateQuiz(text: string): Promise<string> {
  return callGemini(`Tạo 5 câu trắc nghiệm IELTS/TOEIC từ đoạn văn. 4 lựa chọn, 1 đáp án đúng.
Trả về ONLY JSON: [{"question":"","options":["A","B","C","D"],"answer":"A","explanation":""}]\n\nĐoạn văn: ${text}`);
}

export async function chatWithAI(message: string, wordCount: number, topics: string[]): Promise<string> {
  return callGemini(message, `Bạn là AI hỗ trợ học tiếng Anh. Người dùng có ${wordCount} từ, chủ đề: ${topics.join(', ') || 'chung'}. Trả lời ngắn gọn bằng tiếng Việt. Khi giải thích từ: nghĩa, collocations, 1 ví dụ.`);
}

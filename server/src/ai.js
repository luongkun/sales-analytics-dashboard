/**
 * ai.js (Task 82) —統 nhất gọi LLM cho /api/chat theo 2 môi trường:
 *
 * 1) PUBLIC (Render/production): set env ZAI_API_KEY (key open platform z.ai /
 *    bigmodel.cn) → gọi thẳng https://api.z.ai/api/paas/v4/chat/completions
 *    - optional env: ZAI_BASE_URL (mặc định), ZAI_MODEL (mặc định glm-4.5-air)
 * 2) INTERNAL (sandbox Z.ai): không set gì → z-ai-web-dev-sdk đọc .z-ai-config
 *    (baseUrl internal-api.z.ai — CHỈ reachable từ mạng sandbox, không dùng
 *    được từ Render vì IP private 172.25.x.x)
 */
let zaiPromise = null;

export async function chatComplete(messages) {
  const apiKey = process.env.ZAI_API_KEY;

  // ---- MODE 1: public open-platform API ----
  if (apiKey) {
    const baseUrl = (process.env.ZAI_BASE_URL || 'https://api.z.ai/api/paas/v4').replace(/\/$/, '');
    const model = process.env.ZAI_MODEL || 'glm-4.5-air';
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      throw new Error(`ZAI HTTP ${res.status}: ${body}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  }

  // ---- MODE 2: internal SDK (sandbox) ----
  if (!zaiPromise) {
    zaiPromise = import('z-ai-web-dev-sdk').then((m) => m.default.create());
  }
  const zai = await zaiPromise;
  const completion = await zai.chat.completions.create({ messages });
  return completion?.choices?.[0]?.message?.content || null;
}

/** Trạng thái cấu hình AI — để route trả lỗi dễ hiểu thay vì 'AI đang bận' mù mờ */
export function aiMode() {
  if (process.env.ZAI_API_KEY) return 'public-api';
  return 'internal-sdk';
}

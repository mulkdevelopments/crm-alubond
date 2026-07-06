import { API_BASE } from "./config";

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function askAssistant(
  token: string,
  question: string,
  history: AssistantMessage[]
): Promise<string> {
  const response = await fetch(`${API_BASE}/ai/assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, history }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? "Failed to get AI response");
  }
  const data = (await response.json()) as { answer: string };
  return data.answer;
}

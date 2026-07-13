import { getCurrentConfigVersion, getDigitalHuman } from "@/lib/digitalHumanStore";
import { getFixedQa, getFaq, getInteractionSettings } from "@/lib/digitalHumanOpsStore";
import { insertBehaviorEvents } from "@/lib/behaviorEventStore";
import { retrieve } from "@/lib/bailian/knowledgeBaseService";
import { bailianModels, createBailianClient, getWorkspaceId } from "@/lib/bailian/client";

const Util = require("@alicloud/tea-util");

export type ChatRouterMode = "auto" | "fixed_qa" | "knowledge";

export type ChatRouterInput = {
  deviceCode: string;
  digitalHumanId: string;
  query: string;
  traceId?: string;
  conversationId?: string;
  turnId?: string;
  stream?: boolean;
  mode?: ChatRouterMode;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

export type ChatRouterHit = {
  type: "fixed_qa" | "faq" | "knowledge" | "llm";
  id?: string;
  title?: string;
  text?: string;
  score?: number;
  strategy?: string;
  matchedQuestion?: string;
  sourceTitle?: string;
  nodes?: Array<Record<string, unknown>>;
};

export type ChatRouterResponse = {
  success: true;
  hit: ChatRouterHit;
  reply: string;
  requestId?: string;
};

export async function runChatRouter(input: ChatRouterInput): Promise<ChatRouterResponse> {
  const { digitalHumanId, query } = input;
  const trimmed = query.trim();
  const traceKey = input.traceId || `${input.deviceCode}:${Date.now()}`;
  const logEvent = (
    eventName: string,
    payload?: Record<string, unknown>,
    category: string = "llm",
  ) => {
    insertBehaviorEvents([{
      id: `${traceKey}:${eventName}:${Date.now()}`,
      sessionId: input.traceId || input.deviceCode,
      conversationId: input.conversationId,
      turnId: input.turnId,
      traceId: input.traceId,
      deviceCode: input.deviceCode,
      digitalHumanId,
      source: "server",
      category,
      eventName,
      timestampMs: Date.now(),
      payload,
    }]);
  };

  const human = getDigitalHuman(digitalHumanId);
  if (!human) {
    throw new Error("角色不存在");
  }
  const version = getCurrentConfigVersion(digitalHumanId);
  const config = version?.config;
  getInteractionSettings(digitalHumanId);
  const fixedQa = getFixedQa(digitalHumanId);
  const faq = getFaq(digitalHumanId);
  const mode = normalizeRouterMode(input.mode);

  const selectedFixedQaIds = new Set(config?.selectedFixedQaIds ?? []);
  const enabledFixedQa = fixedQa.items.filter(
    (item) => item.status === "enabled" && selectedFixedQaIds.has(item.id)
  );
  const enabledFaq = faq.items.filter((item) => item.status === "enabled");

  let hit: ChatRouterHit | null = null;
  let reply: string = "";

  // 1. 固定问答 / FAQ
  if (mode !== "knowledge") {
    const fixedQaMatch = findBestQuestionMatch(enabledFixedQa, trimmed, 0.82);
    if (fixedQaMatch) {
      logEvent("router_fixed_qa_hit", {
        itemId: fixedQaMatch.item.id,
        score: fixedQaMatch.score,
        strategy: fixedQaMatch.strategy,
      });
      hit = {
        type: "fixed_qa",
        id: fixedQaMatch.item.id,
        title: fixedQaMatch.item.question,
        matchedQuestion: fixedQaMatch.item.question,
        text: fixedQaMatch.item.answer,
        score: fixedQaMatch.score,
        strategy: fixedQaMatch.strategy,
      };
      reply = fixedQaMatch.item.answer;
    }
  }

  if (!hit && mode !== "knowledge") {
    const faqMatch = findBestQuestionMatch(enabledFaq, trimmed, 0.84);
    if (faqMatch) {
      logEvent("router_faq_hit", {
        itemId: faqMatch.item.id,
        score: faqMatch.score,
        strategy: faqMatch.strategy,
      });
      hit = {
        type: "faq",
        id: faqMatch.item.id,
        title: faqMatch.item.question,
        matchedQuestion: faqMatch.item.question,
        text: faqMatch.item.answer,
        score: faqMatch.score,
        strategy: faqMatch.strategy,
      };
      reply = faqMatch.item.answer;
    }
  }

  // 2. 知识库检索
  if (!hit && config?.knowledgeBaseIndexId && mode !== "fixed_qa") {
    const retrieveStartedAt = Date.now();
    logEvent("router_knowledge_retrieve_start", {
      knowledgeBaseIndexId: config.knowledgeBaseIndexId,
    });
    const result = await retrieve(config.knowledgeBaseIndexId, trimmed);
    const data = result.Data ?? result.data ?? {};
    const nodes = data.Nodes ?? data.nodes ?? [];
    const knowledgeHit = pickKnowledgeNode(Array.isArray(nodes) ? nodes : [], mode);
    logEvent("router_knowledge_retrieve_completed", {
      elapsedMs: Date.now() - retrieveStartedAt,
      nodeCount: Array.isArray(nodes) ? nodes.length : 0,
      hit: !!knowledgeHit,
    });
    if (knowledgeHit) {
      hit = {
        type: "knowledge",
        title: knowledgeHit.title,
        sourceTitle: knowledgeHit.title,
        nodes: knowledgeHit.nodes,
        text: knowledgeHit.text,
        score: knowledgeHit.score,
        strategy: knowledgeHit.strategy,
      };
      reply = knowledgeHit.text;
    }
  }

  // 3. LLM 兜底
  if (!hit) {
    const llmStartedAt = Date.now();
    logEvent("router_llm_start", {
      mode,
      historyCount: input.history?.length || 0,
    });
    const llmResult = await callBailianLlm({
      systemPrompt: config?.systemPrompt || "",
      prefixPrompt: config?.prefixPrompt || "",
      query: trimmed,
      history: input.history || [],
      llmModel: config?.llmModel || "",
    });
    hit = { type: "llm", text: llmResult.text, strategy: mode === "fixed_qa" ? "fixed_qa_miss_to_llm" : mode === "knowledge" ? "knowledge_miss_to_llm" : "auto_to_llm" };
    reply = llmResult.text;
    logEvent("router_llm_completed", {
      elapsedMs: Date.now() - llmStartedAt,
      requestId: llmResult.requestId || "",
      replyLength: reply.length,
    });
    return {
      success: true,
      hit,
      reply,
      requestId: llmResult.requestId,
    };
  }

  return {
    success: true,
    hit,
    reply,
  };
}

type QuestionLikeItem = {
  id: string;
  question: string;
  answer: string;
};

type QuestionMatch<T extends QuestionLikeItem> = {
  item: T;
  score: number;
  strategy: string;
};

function normalizeRouterMode(mode: ChatRouterInput["mode"]): ChatRouterMode {
  if (mode === "fixed_qa" || mode === "knowledge") {
    return mode;
  }
  return "auto";
}

function findBestQuestionMatch<T extends QuestionLikeItem>(
  items: T[],
  query: string,
  minScore: number,
): QuestionMatch<T> | null {
  const normalizedQuery = normalizeQuestion(query);
  if (!normalizedQuery) {
    return null;
  }

  let best: QuestionMatch<T> | null = null;
  for (const item of items) {
    const normalizedQuestion = normalizeQuestion(item.question);
    if (!normalizedQuestion) {
      continue;
    }
    const candidate = scoreQuestionMatch(normalizedQuery, normalizedQuestion);
    if (candidate.score < minScore) {
      continue;
    }
    if (!best || candidate.score > best.score) {
      best = {
        item,
        score: candidate.score,
        strategy: candidate.strategy,
      };
    }
  }
  return best;
}

function scoreQuestionMatch(query: string, question: string) {
  if (query === question) {
    return { score: 1, strategy: "normalized_exact" };
  }

  const minLength = Math.min(query.length, question.length);
  if (minLength >= 4 && (query.includes(question) || question.includes(query))) {
    const score = minLength >= 8 ? 0.96 : 0.92;
    return { score, strategy: "contains" };
  }

  const charOverlap = computeCharOverlap(query, question);
  const bigramDice = computeBigramDice(query, question);
  const prefixBonus = query[0] === question[0] ? 0.03 : 0;
  const suffixBonus = query.slice(-1) === question.slice(-1) ? 0.02 : 0;
  const score = clampScore(bigramDice * 0.72 + charOverlap * 0.28 + prefixBonus + suffixBonus);
  return { score, strategy: "semantic_like" };
}

function readRetrieveNodeText(node: Record<string, unknown>): string {
  if (!node) return "";
  const text = node.text ?? node.Text ?? node.chunk ?? node.Chunk ?? node.content ?? node.Content ?? "";
  return String(text).trim();
}

function pickKnowledgeNode(nodes: Array<Record<string, unknown>>, mode: ChatRouterMode) {
  if (!nodes.length) {
    return null;
  }
  const enriched = nodes
    .map((node) => {
      const text = readRetrieveNodeText(node);
      const score = readRetrieveNodeScore(node);
      const title = readRetrieveNodeTitle(node);
      if (!text) {
        return null;
      }
      return {
        node,
        text,
        title,
        score,
      };
    })
    .filter((item): item is { node: Record<string, unknown>; text: string; title: string; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score || b.text.length - a.text.length);

  if (!enriched.length) {
    return null;
  }

  const top = enriched[0];
  const minScore = mode === "knowledge" ? 0.28 : 0.42;
  if (top.score < minScore) {
    return null;
  }

  return {
    text: top.text,
    title: top.title,
    score: top.score,
    strategy: top.score >= 0.6 ? "retrieve_high_confidence" : "retrieve_low_confidence",
    nodes,
  };
}

function readRetrieveNodeScore(node: Record<string, unknown>) {
  const metadata = readNodeMetadata(node);
  const candidates = [
    node.Score,
    node.score,
    metadata?.Score,
    metadata?.score,
    metadata?._score,
    metadata?._rc_v_score,
    metadata?._q_score,
  ];
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function readRetrieveNodeTitle(node: Record<string, unknown>) {
  const metadata = readNodeMetadata(node);
  const value = metadata?.title ?? metadata?.hier_title ?? metadata?.doc_name ?? metadata?.docName ?? "";
  return String(value || "").trim();
}

function readNodeMetadata(node: Record<string, unknown>) {
  const metadata = node.Metadata ?? node.metadata;
  return metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : null;
}

function normalizeQuestion(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[，。！？、；：,.!?\-_/\\“”"'‘’（）()【】\[\]<>《》]/g, "");
}

function computeCharOverlap(a: string, b: string) {
  const aSet = new Set(a.split(""));
  const bSet = new Set(b.split(""));
  let shared = 0;
  for (const char of aSet) {
    if (bSet.has(char)) {
      shared += 1;
    }
  }
  const total = Math.max(aSet.size + bSet.size, 1);
  return (shared * 2) / total;
}

function computeBigramDice(a: string, b: string) {
  const aBigrams = buildBigrams(a);
  const bBigrams = buildBigrams(b);
  if (!aBigrams.length || !bBigrams.length) {
    return 0;
  }
  const bCounter = new Map<string, number>();
  for (const token of bBigrams) {
    bCounter.set(token, (bCounter.get(token) ?? 0) + 1);
  }
  let shared = 0;
  for (const token of aBigrams) {
    const count = bCounter.get(token) ?? 0;
    if (count > 0) {
      shared += 1;
      bCounter.set(token, count - 1);
    }
  }
  return (shared * 2) / (aBigrams.length + bBigrams.length);
}

function buildBigrams(value: string) {
  if (value.length < 2) {
    return [value];
  }
  const result: string[] = [];
  for (let i = 0; i < value.length - 1; i += 1) {
    result.push(value.slice(i, i + 2));
  }
  return result;
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

async function callBailianLlm({
  systemPrompt,
  prefixPrompt,
  query,
  history,
  llmModel,
}: {
  systemPrompt: string;
  prefixPrompt: string;
  query: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  llmModel?: string;
}) {
  const client = createBailianClient();
  const workspaceId = getWorkspaceId();

  const messages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...(prefixPrompt ? [{ role: "system", content: prefixPrompt }] : []),
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: query },
  ];

  const request = new bailianModels.CallCompletionRequest({
    model: llmModel || "qwen-turbo",
    input: {
      messages,
    },
  });

  const response = await client.callCompletionWithOptions(
    workspaceId,
    request,
    {},
    new Util.RuntimeOptions({})
  );

  const body = response.body;
  const output = body?.output;
  const choices = output?.choices;
  const firstChoice = Array.isArray(choices) ? choices[0] : null;
  const message = firstChoice?.message;
  const text = message?.content ?? message?.Content ?? "";

  return {
    text: String(text).trim(),
    requestId: String(body?.requestId ?? body?.RequestId ?? ""),
  };
}

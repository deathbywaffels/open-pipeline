const API_KEY_STORAGE_KEY = "ai.apiKey";
const MODEL_STORAGE_KEY = "ai.model";

export const AI_MODELS = [
  { value: "claude-opus-4-8", label: "Claude Opus 4.8 — most capable" },
  { value: "claude-sonnet-5", label: "Claude Sonnet 5 — balanced" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 — fastest" },
];

export const DEFAULT_AI_MODEL = AI_MODELS[0].value;

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
}

export function setApiKey(key) {
  if (key) {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } else {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  }
}

export function hasApiKey() {
  return Boolean(getApiKey());
}

export function getModel() {
  return localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_AI_MODEL;
}

export function setModel(model) {
  localStorage.setItem(MODEL_STORAGE_KEY, model);
}

/**
 * Headers for any AI-extraction request. The key travels only from the
 * browser to this app's own backend, which relays it to Anthropic and never
 * persists it — see the note in Settings for the full BYOK explanation.
 */
export function aiHeaders() {
  return {
    "X-AI-Api-Key": getApiKey(),
    "X-AI-Model": getModel(),
  };
}

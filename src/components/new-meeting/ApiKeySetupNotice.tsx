"use client";

import React, { useState } from "react";
import { KeyRound, AlertTriangle, ExternalLink, Check, Copy, Sparkles } from "lucide-react";

interface ApiKeySetupNoticeProps {
  onSessionKeySubmit?: (key: string) => void;
  onRunDemoFallback?: () => void;
  currentSessionKey?: string;
  isProcessing?: boolean;
}

export function ApiKeySetupNotice({
  onSessionKeySubmit,
  onRunDemoFallback,
  currentSessionKey = "",
  isProcessing = false,
}: ApiKeySetupNoticeProps) {
  const [keyInput, setKeyInput] = useState(currentSessionKey);
  const [savedLocally, setSavedLocally] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const envSnippet = `GEMINI_API_KEY="AQ.Ab...YourGeminiApiKeyHere"`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSnippet);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleSaveSessionKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSessionKeySubmit && keyInput.trim()) {
      onSessionKeySubmit(keyInput.trim());
      setSavedLocally(true);
      setTimeout(() => setSavedLocally(false), 2500);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/70 border border-amber-200/90 shadow-2xs space-y-4 animate-in fade-in duration-200">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
          <KeyRound className="w-5 h-5 text-amber-700" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-amber-950">
              LLM API Key Required for Real Extraction
            </h3>
            <span className="text-[10px] font-semibold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
              Setup Required
            </span>
          </div>
          <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
            Meeting Mind requires an active LLM key to run live extraction. As per project guidelines, we never fake model extraction when an API key is missing.
          </p>
        </div>
      </div>

      {/* Two setup methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Method 1: Environment Variable */}
        <div className="p-4 rounded-xl bg-white border border-amber-200/80 text-xs space-y-2">
          <span className="font-semibold text-stone-900 block text-xs">
            Method 1: Server Environment (.env.local)
          </span>
          <p className="text-stone-600 text-[11px] leading-relaxed">
            Create or edit <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-800">.env.local</code> in the project root:
          </p>

          <div className="relative">
            <pre className="p-2.5 rounded-lg bg-stone-900 text-stone-100 font-mono text-[10px] overflow-x-auto">
              {envSnippet}
            </pre>
            <button
              onClick={handleCopyEnv}
              type="button"
              className="absolute right-2 top-2 p-1 text-stone-400 hover:text-white transition-colors cursor-pointer"
              title="Copy snippet"
            >
              {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700 hover:text-orange-800"
          >
            Get a free Google Gemini API key <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Method 2: Live Session Key Input */}
        <div className="p-4 rounded-xl bg-white border border-amber-200/80 text-xs space-y-2">
          <span className="font-semibold text-stone-900 block text-xs">
            Method 2: Interactive Session Key
          </span>
          <p className="text-stone-600 text-[11px] leading-relaxed">
            Test immediately without restarting the dev server. Sent only server-side to the extraction API:
          </p>

          <form onSubmit={handleSaveSessionKey} className="space-y-2">
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste Gemini API key (AQ.Ab... or AIza...)"
              className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-orange-500 font-mono"
            />
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs shadow-2xs transition-colors cursor-pointer"
              >
                Set Session Key
              </button>
              {savedLocally && (
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Key active for this session
                </span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Alternative: Test Full Pipeline with Verified Demonstration Payload */}
      {onRunDemoFallback && (
        <div className="pt-2 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <span className="text-amber-900 text-[11px]">
            Want to test Phase 3 persistence and conflict detection right now without adding an API key?
          </span>
          <button
            onClick={onRunDemoFallback}
            disabled={isProcessing}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/60 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            Test DB Persistence & Conflict Engine
          </button>
        </div>
      )}
    </div>
  );
}

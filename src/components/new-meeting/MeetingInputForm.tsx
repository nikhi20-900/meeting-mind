"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Mic,
  Calendar,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  RotateCcw,
  ShieldAlert,
  Info,
  KeyRound,
  Bot,
  AlertTriangle,
} from "lucide-react";
import { sampleRecapTemplates } from "@/data/mockData";
import { ExtractApiResponse } from "@/types/extraction";
import { ExtractionResultView } from "./ExtractionResultView";
import { ApiKeySetupNotice } from "./ApiKeySetupNotice";

export function MeetingInputForm() {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("2026-10-31");
  const [recapText, setRecapText] = useState("");
  const [attendees, setAttendees] = useState("Marcus Vance, Sarah Chen, Alex Morgan");
  const [sessionApiKey, setSessionApiKey] = useState("");

  const [errors, setErrors] = useState<{ title?: string; recapText?: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiError, setApiError] = useState<{
    code: string;
    message: string;
    details?: string;
  } | null>(null);

  const [extractionResponse, setExtractionResponse] = useState<ExtractApiResponse | null>(null);

  const handleLoadTemplate = (index: number) => {
    const template = sampleRecapTemplates[index];
    if (template) {
      setTitle(template.title);
      setMeetingDate(template.date);
      setRecapText(template.recap);
      setErrors({});
      setApiError(null);
      setExtractionResponse(null);
    }
  };

  const handleClear = () => {
    setTitle("");
    setRecapText("");
    setErrors({});
    setApiError(null);
    setExtractionResponse(null);
  };

  const executeExtraction = async (allowFallback: boolean = false) => {
    const newErrors: { title?: string; recapText?: string } = {};

    if (!title.trim()) {
      newErrors.title = "Meeting title is required.";
    }

    if (!recapText.trim()) {
      newErrors.recapText = "Please provide or dictate a meeting recap.";
    } else if (recapText.trim().length < 20) {
      newErrors.recapText = "Meeting recap is too short (please provide at least 20 characters).";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setApiError(null);
      return;
    }

    setErrors({});
    setApiError(null);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          date: meetingDate,
          recapText: recapText.trim(),
          attendees: attendees.trim(),
          sessionApiKey: sessionApiKey.trim() || undefined,
          allowDemonstrationFallback: allowFallback,
        }),
      });

      const data: ExtractApiResponse = await res.json();

      if (!res.ok || !data.success) {
        setApiError({
          code: data.success === false ? data.error : "EXTRACTION_FAILED",
          message:
            data.success === false
              ? data.message
              : "Server failed to process meeting extraction.",
          details: data.success === false ? data.details : undefined,
        });
        setExtractionResponse(null);
      } else {
        setExtractionResponse(data);
        setApiError(null);
      }
    } catch (err: any) {
      setApiError({
        code: "NETWORK_ERROR",
        message: err.message || "Failed to connect to extraction API route.",
      });
      setExtractionResponse(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    executeExtraction(false);
  };

  return (
    <div className="space-y-6">
      {/* Template Quick Loader Bar */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-stone-600">
          <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="font-semibold text-stone-900">Quick Test Templates:</span>
          <span>Populate realistic transcript samples</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleLoadTemplate(0)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer"
          >
            Load: Architecture Sync
          </button>
          <button
            type="button"
            onClick={() => handleLoadTemplate(1)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer"
          >
            Load: Client SLA Review
          </button>
          {(title || recapText) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors"
              title="Clear all fields"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleProcessMeeting} className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-5 sm:p-7 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Meeting Title Field */}
          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="meeting-title" className="block text-xs sm:text-sm font-semibold text-stone-800">
              Meeting Title <span className="text-orange-600">*</span>
            </label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="e.g. Q4 Cloud Spanner Migration & Rate Limiting Sync"
              className={`w-full px-3.5 py-2.5 text-sm bg-stone-50/60 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                errors.title ? "border-rose-400 bg-rose-50/20" : "border-stone-200"
              }`}
            />
            {errors.title && (
              <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Meeting Date Field (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="meeting-date" className="block text-xs sm:text-sm font-semibold text-stone-800">
              Meeting Date <span className="text-xs font-normal text-stone-400">(Optional)</span>
            </label>
            <div className="relative">
              <input
                id="meeting-date"
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50/60 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-stone-800"
              />
            </div>
          </div>
        </div>

        {/* Optional Attendees */}
        <div className="space-y-1.5">
          <label htmlFor="meeting-attendees" className="block text-xs sm:text-sm font-semibold text-stone-800">
            Key Participants <span className="text-xs font-normal text-stone-400">(Optional, comma separated)</span>
          </label>
          <input
            id="meeting-attendees"
            type="text"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="e.g. Marcus Vance, Sarah Chen, Elena Rostova"
            className="w-full px-3.5 py-2 text-sm bg-stone-50/60 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-stone-800"
          />
        </div>

        {/* Wispr Flow Voice Dictation Helper Banner */}
        <div className="p-4 rounded-xl bg-[#FFFBF5] border border-orange-200/90 text-stone-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 shrink-0 mt-0.5">
            <Mic className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-semibold text-stone-900 flex items-center gap-2">
              Dictate directly with Wispr Flow
              <span className="text-[10px] bg-orange-600 text-white font-medium px-1.5 py-0.2 rounded-md">
                Voice Ready
              </span>
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              You can dictate directly into the text box below using <strong>Wispr Flow</strong>. Speak your thoughts naturally, summarize the meeting live, or paste a raw transcript from Zoom, Google Meet, or Slack Huddles.
            </p>
          </div>
        </div>

        {/* Large Text Area: Meeting Recap / Transcript */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="meeting-recap" className="block text-xs sm:text-sm font-semibold text-stone-800">
              Dictate or Paste Your Meeting Recap <span className="text-orange-600">*</span>
            </label>
            <span className="text-xs text-stone-400 font-mono">
              {recapText.length} characters • {recapText.trim() ? recapText.trim().split(/\s+/).filter(Boolean).length : 0} words
            </span>
          </div>

          <div className="relative">
            <textarea
              id="meeting-recap"
              rows={11}
              value={recapText}
              onChange={(e) => {
                setRecapText(e.target.value);
                if (errors.recapText) setErrors((prev) => ({ ...prev, recapText: undefined }));
              }}
              placeholder={`Paste raw transcript or dictate recap using Wispr Flow...\n\nExample structure:\n- Decisions agreed upon (e.g. Rate limits, cloud vendors, design standards)\n- Action items with owners and deadlines\n- Speaker attributions and commitments`}
              className={`w-full p-4 text-sm font-mono leading-relaxed bg-[#FAF9F6] border rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                errors.recapText ? "border-rose-400 bg-rose-50/20" : "border-stone-200"
              }`}
            />
          </div>

          {errors.recapText && (
            <p className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.recapText}
            </p>
          )}
        </div>

        {/* Action Button Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Bot className="w-3.5 h-3.5 text-stone-400" />
            <span>Persists extracted decisions and creates tasks awaiting approval. Detects cross-meeting conflicts.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-xl text-stone-600 hover:text-stone-900 bg-white border border-stone-200 hover:border-stone-300 transition-colors cursor-pointer"
            >
              Reset
            </button>

            <button
              type="submit"
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-60 shadow-xs transition-all cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running Extraction & Conflict Engine...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Process & Persist Meeting
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Clear Setup Message when No API Key is Configured */}
      {apiError && apiError.code === "MISSING_API_KEY" && (
        <ApiKeySetupNotice
          currentSessionKey={sessionApiKey}
          isProcessing={isProcessing}
          onSessionKeySubmit={(key) => {
            setSessionApiKey(key);
            setApiError(null);
          }}
          onRunDemoFallback={() => {
            executeExtraction(true);
          }}
        />
      )}

      {/* Invalid Key Error Banner */}
      {apiError && apiError.message.toLowerCase().includes("invalid") && (
        <div className="p-5 bg-white rounded-2xl border border-rose-200 bg-rose-50/30 shadow-2xs space-y-2 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Gemini API Authentication Failed: Invalid Key
          </div>
          <p className="text-rose-800 leading-relaxed">
            The key provided does not match an authorized Google AI Gemini key. Please verify that your <code className="bg-rose-100 px-1 py-0.5 rounded font-mono text-rose-900">GEMINI_API_KEY</code> in <code className="bg-rose-100 px-1 py-0.5 rounded font-mono text-rose-900">.env.local</code> is copied correctly from Google AI Studio.
          </p>
          <div className="pt-1 flex items-center gap-3">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-rose-900 underline hover:text-rose-950"
            >
              Verify key in Google AI Studio &rarr;
            </a>
          </div>
        </div>
      )}

      {/* Rate Limit Exceeded Banner */}
      {apiError && apiError.message.toLowerCase().includes("rate limit") && (
        <div className="p-5 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs space-y-2 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Gemini Flash Rate Limit Reached
          </div>
          <p className="text-amber-800 leading-relaxed">
            You have hit the request quota limit for your Gemini API tier. Please wait 30 seconds before submitting another meeting recap.
          </p>
        </div>
      )}

      {/* General API / Validation Error Banner */}
      {apiError &&
        apiError.code !== "MISSING_API_KEY" &&
        !apiError.message.toLowerCase().includes("invalid") &&
        !apiError.message.toLowerCase().includes("rate limit") && (
          <div className="p-5 bg-white rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Extraction Error: {apiError.code}
            </div>
            <p className="text-rose-800">{apiError.message}</p>
            {apiError.details && (
              <pre className="p-2.5 rounded bg-rose-100/60 text-rose-950 font-mono text-[10px] overflow-x-auto">
                {apiError.details}
              </pre>
            )}
          </div>
        )}

      {/* Real Model Extraction Result View with Persistence Confirmation & Conflict Warnings */}
      {extractionResponse && extractionResponse.success && (
        <ExtractionResultView
          result={extractionResponse.result}
          isPersisted={extractionResponse.isPersisted}
          savedDecisions={extractionResponse.savedDecisions}
          savedTasks={extractionResponse.savedTasks}
          detectedConflicts={extractionResponse.detectedConflicts}
          onReset={() => {
            setExtractionResponse(null);
            handleClear();
          }}
        />
      )}
    </div>
  );
}

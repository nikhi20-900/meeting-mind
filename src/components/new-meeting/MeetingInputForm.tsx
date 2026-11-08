"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic,
  AlertCircle,
  FileText,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { sampleRecapTemplates } from "@/data/mockData";
import { ExtractApiResponse, MeetingExtractionResult } from "@/types/extraction";
import { ExtractionResultView } from "./ExtractionResultView";
import { ApiKeySetupNotice } from "./ApiKeySetupNotice";

function localDateValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function MeetingInputForm() {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [recapText, setRecapText] = useState("");
  const [attendees, setAttendees] = useState("");
  const [sessionApiKey, setSessionApiKey] = useState("");

  const [errors, setErrors] = useState<{ title?: string; recapText?: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<{
    code: string;
    message: string;
    details?: string;
  } | null>(null);

  const [extractionResponse, setExtractionResponse] = useState<ExtractApiResponse | null>(null);

  useEffect(() => {
    setMeetingDate(localDateValue());
  }, []);

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

  const handleConfirmSave = async (reviewedResult: MeetingExtractionResult) => {
    if (!extractionResponse || !extractionResponse.success) return;
    setIsSaving(true);
    setApiError(null);
    try {
      const res = await fetch("/api/meetings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date: meetingDate,
          recapText: recapText.trim(),
          attendees: attendees.trim(),
          extraction: reviewedResult,
        }),
      });
      const data: ExtractApiResponse = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.success === false ? data.message : "Could not save this meeting.");
      }
      setExtractionResponse(data);
    } catch (err: any) {
      setApiError({ code: "SAVE_FAILED", message: err.message || "Could not save this meeting. Your review is still here." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleProcessMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    executeExtraction(false);
  };

  return (
    <div className="space-y-6">
      {!extractionResponse && (
      <div className="space-y-6">
      {/* Template Quick Loader Bar */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-stone-600">
          <FileText className="w-4 h-4 text-orange-600 shrink-0" />
          <span className="font-semibold text-stone-900">Start from an example:</span>
          <span>Use a sample to fill in the form</span>
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
          <button
            type="button"
            onClick={() => handleLoadTemplate(2)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 transition-colors cursor-pointer flex items-center gap-1"
          >
            <FileText className="w-3 h-3 text-orange-600" />
            Security policy example
          </button>
          {(title || recapText) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-stone-500 hover:text-stone-900 transition-colors"
              aria-label="Clear all fields"
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
              required
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "meeting-title-error" : undefined}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="e.g. Product planning, 14 May"
              className={`w-full px-3.5 py-2.5 text-sm bg-stone-50/60 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                errors.title ? "border-rose-400 bg-rose-50/20" : "border-stone-200"
              }`}
            />
            {errors.title && (
              <p id="meeting-title-error" role="alert" className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
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
            placeholder="e.g. Sam Lee, Jordan Park"
            className="w-full px-3.5 py-2 text-sm bg-stone-50/60 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-stone-800"
          />
        </div>

        {/* Optional dictation helper */}
        <div className="p-4 rounded-xl bg-[#FFFBF5] border border-orange-200/90 text-stone-800 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 shrink-0 mt-0.5">
            <Mic className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-semibold text-stone-900 flex items-center gap-2">
              Add your meeting recap

            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Paste a transcript or write a short recap. You can also dictate into this field using your device’s dictation feature.
            </p>
          </div>
        </div>

        {/* Large Text Area: Meeting Recap / Transcript */}
        <div className="space-y-1.5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="meeting-recap" className="block text-xs sm:text-sm font-semibold text-stone-800">
              Meeting recap or transcript <span className="text-orange-600">*</span>
            </label>
            <span aria-label={`${recapText.length} characters, ${recapText.trim() ? recapText.trim().split(/\s+/).filter(Boolean).length : 0} words`} className="text-xs text-stone-500">
              {recapText.length} characters • {recapText.trim() ? recapText.trim().split(/\s+/).filter(Boolean).length : 0} words
            </span>
          </div>

          <div className="relative">
            <textarea
              id="meeting-recap"
              rows={11}
              required
              minLength={15}
              aria-invalid={Boolean(errors.recapText)}
              aria-describedby={errors.recapText ? "meeting-recap-error" : undefined}
              value={recapText}
              onChange={(e) => {
                setRecapText(e.target.value);
                if (errors.recapText) setErrors((prev) => ({ ...prev, recapText: undefined }));
              }}
              placeholder={`Paste a transcript or write a short recap...\n\nHelpful details to include:\n- Decisions people agreed on\n- Tasks, owners, and due dates\n- Who said what, if it matters`}
              className={`w-full p-4 text-sm leading-relaxed bg-[#FAF9F6] border rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all ${
                errors.recapText ? "border-rose-400 bg-rose-50/20" : "border-stone-200"
              }`}
            />
          </div>

          {errors.recapText && (
            <p id="meeting-recap-error" role="alert" className="text-xs text-rose-600 flex items-center gap-1 mt-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
              {errors.recapText}
            </p>
          )}
        </div>

        {/* Action Button Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span>Nothing is saved until you review and confirm the extracted details.</span>
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
                  Preparing review...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Review meeting
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      </div>
      )}

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

      {/* Extraction key error */}
      {apiError && apiError.message.toLowerCase().includes("invalid") && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Could not use this extraction key</p>
          <p className="mt-1">Check the key and try again.</p>
        </div>
      )}

      {/* Rate limit error */}
      {apiError && apiError.message.toLowerCase().includes("rate limit") && (
        <div role="alert" className="p-5 bg-white rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs space-y-2 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Service is busy
          </div>
          <p className="text-amber-800 leading-relaxed">
            Please wait a moment, then try again.
          </p>
        </div>
      )}

      {/* General API / Validation Error Banner */}
      {apiError &&
        apiError.code !== "MISSING_API_KEY" &&
        !apiError.message.toLowerCase().includes("invalid") &&
        !apiError.message.toLowerCase().includes("rate limit") && (
          <div role="alert" className="p-5 bg-white rounded-2xl border border-rose-200 bg-rose-50/20 shadow-2xs space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Could not process meeting
            </div>
            <p className="text-rose-800">{apiError.message}</p>
            
          </div>
        )}

      {/* Meeting review */}
      {extractionResponse && extractionResponse.success && (
        <ExtractionResultView
          result={extractionResponse.result}
          isPersisted={extractionResponse.isPersisted}
          isSaving={isSaving}
          onConfirmSave={handleConfirmSave}
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

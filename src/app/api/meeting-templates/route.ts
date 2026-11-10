import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest, enforceRateLimit, readJsonBody } from "@/lib/apiSecurity";
import { createMeetingTemplate, deleteMeetingTemplate, getMeetingTemplates } from "@/lib/db/repository";

export async function GET(request: NextRequest) {
  const denied = authenticateApiRequest(request);
  if (denied) return denied;
  const limited = await enforceRateLimit(request, "meeting-templates-read", 60, 60_000);
  if (limited) return limited;
  try {
    return NextResponse.json({ success: true, templates: await getMeetingTemplates() });
  } catch (error) {
    console.error("[api/meeting-templates] Could not load templates:", error);
    return NextResponse.json({ success: false, message: "Templates could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = authenticateApiRequest(request, { mutation: true });
  if (denied) return denied;
  const limited = await enforceRateLimit(request, "meeting-templates-create", 20, 60_000);
  if (limited) return limited;
  const parsed = await readJsonBody(request, 16_384);
  if (parsed.response) return parsed.response;
  const { name, title, recapText } = parsed.body || {};
  if (typeof name !== "string" || typeof title !== "string" || typeof recapText !== "string") {
    return NextResponse.json({ success: false, message: "Add a name, meeting title, and recap format." }, { status: 400 });
  }
  const values = { name: name.trim(), title: title.trim(), recapText: recapText.trim() };
  if (!values.name || values.name.length > 80 || values.title.length > 160 || !values.recapText || values.recapText.length > 10_000) {
    return NextResponse.json({ success: false, message: "Use a name under 80 characters, a title under 160 characters, and a recap under 10,000 characters." }, { status: 400 });
  }
  try {
    const template = await createMeetingTemplate(values);
    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error) {
    const duplicateName = error instanceof Error && error.message.includes("already exists");
    return NextResponse.json(
      { success: false, message: duplicateName ? error.message : "Template could not be saved." },
      { status: duplicateName ? 409 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const denied = authenticateApiRequest(request, { mutation: true });
  if (denied) return denied;
  const limited = await enforceRateLimit(request, "meeting-templates-delete", 20, 60_000);
  if (limited) return limited;
  const parsed = await readJsonBody(request, 2_048);
  if (parsed.response) return parsed.response;
  const templateId = parsed.body?.id;
  if (typeof templateId !== "string" || !templateId.startsWith("tpl-")) {
    return NextResponse.json({ success: false, message: "Choose a saved template to remove." }, { status: 400 });
  }
  try {
    const deleted = await deleteMeetingTemplate(templateId);
    return deleted
      ? NextResponse.json({ success: true })
      : NextResponse.json({ success: false, message: "This template was already removed." }, { status: 404 });
  } catch (error) {
    console.error("[api/meeting-templates] Could not remove template:", error);
    return NextResponse.json({ success: false, message: "Template could not be removed." }, { status: 500 });
  }
}

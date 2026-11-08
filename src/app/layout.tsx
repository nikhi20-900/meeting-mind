import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meeting Mind | Agentic Meeting Decisions & Task Memory",
  description: "Turn meeting conversations into confirmed decisions, track commitments, and detect cross-meeting conflicts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#FBF9F5] text-stone-900 selection:bg-orange-100 selection:text-orange-900 font-sans">
        {children}
      </body>
    </html>
  );
}

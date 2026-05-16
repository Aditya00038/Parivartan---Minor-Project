'use client';

import { ChatbotPageShell } from '@/components/chatbot-page-shell';

export default function ChatbotPage() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <ChatbotPageShell />
      </div>
    </div>
  );
}
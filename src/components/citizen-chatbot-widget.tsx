'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatbotPageShell } from '@/components/chatbot-page-shell';

export default function CitizenChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Close chatbot' : 'Open chatbot'}
        className="group fixed bottom-28 right-4 z-[60] md:bottom-8 md:right-8"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{isOpen ? 'Close chat' : 'Need help?'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{isOpen ? 'Tap to hide Roadie' : 'Chat with Roadie'}</p>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 p-4 backdrop-blur-[2px] md:inset-auto md:bottom-20 md:right-8 md:bg-transparent md:p-0">
          <div className="ml-auto flex h-[min(72vh,640px)] w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <ChatbotPageShell compact onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
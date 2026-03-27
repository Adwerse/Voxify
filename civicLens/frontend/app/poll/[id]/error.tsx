"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function PollError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={20} className="text-zinc-400" />
        </div>
        <h2 className="text-lg font-medium mb-2">Couldn&apos;t load this poll</h2>
        <p className="text-sm text-zinc-400 mb-6">
          The poll may have been removed or the link is incorrect.
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 mx-auto text-sm border border-zinc-200 rounded-full px-5 py-2 hover:bg-zinc-50 transition-colors"
        >
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    </div>
  );
}
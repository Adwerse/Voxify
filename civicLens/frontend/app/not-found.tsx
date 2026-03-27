import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <SearchX size={20} className="text-zinc-400" />
        </div>
        <h2 className="text-lg font-medium mb-2">Page not found</h2>
        <p className="text-sm text-zinc-400 mb-6">
          This link may be outdated, or the page may have been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center text-sm border border-zinc-200 rounded-full px-5 py-2 hover:bg-zinc-50 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
// frontend/src/components/ui/TypingIndicator.jsx

import React from "react";

export default function TypingIndicator({
  message = "AI is typing...",
  isLongTask = false,
}) {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl px-6 py-4 shadow-md max-w-[70%]">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1">
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-sm text-slate-600 font-medium">{message}</span>
        </div>

        {isLongTask && (
          <div className="mt-2">
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full animate-pulse"
                style={{ width: "60%" }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              This may take a moment...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

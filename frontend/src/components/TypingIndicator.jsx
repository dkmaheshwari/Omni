// frontend/src/components/TypingIndicator.jsx

import React, { useState, useEffect } from "react";

const TypingIndicator = ({
  message = "AI is thinking...",
  isLongTask = false,
}) => {
  const [currentMessage, setCurrentMessage] = useState(message);

  // Progress messages for long summarization tasks
  useEffect(() => {
    if (isLongTask) {
      const messages = [
        "AI is analyzing the conversation...",
        "Processing large conversation in chunks...",
        "Generating comprehensive insights...",
        "Creating intelligent summary...",
        "Almost done, finalizing results...",
      ];

      let index = 0;
      setCurrentMessage(messages[0]);

      const progressInterval = setInterval(() => {
        index = (index + 1) % messages.length;
        setCurrentMessage(messages[index]);
      }, 2500);

      return () => clearInterval(progressInterval);
    } else {
      setCurrentMessage(message);
    }
  }, [isLongTask, message]);

  return (
    <div className="flex justify-start items-start animate-slide-up">
      <div className="flex items-start space-x-4 max-w-3xl">
        {/* AI Avatar with enhanced animation */}
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-xl ring-2 ring-purple-200">
            <span className="text-white text-sm">🤖</span>
          </div>

          {/* Enhanced pulse indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full shadow-lg animate-pulse">
            <div className="w-full h-full bg-emerald-300 rounded-full" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* AI label with enhanced badge */}
          <div className="flex items-center space-x-3 mb-3">
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200">
              <span className="mr-1">🧠</span>
              <span>AI Assistant</span>
            </div>

            {isLongTask && (
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 animate-pulse">
                <span className="mr-1">✨</span>
                <span>Large Task</span>
              </div>
            )}
          </div>

          {/* Enhanced message bubble */}
          <div className="relative bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-sm border border-purple-200/50 rounded-3xl rounded-tl-lg shadow-lg overflow-hidden">
            {/* Accent border */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500 rounded-l-3xl" />

            {/* Content */}
            <div className="relative px-6 py-4 pl-8">
              <div className="flex items-center space-x-3">
                {/* Enhanced typing dots */}
                <div className="flex space-x-1">
                  {[0, 1, 2].map((index) => (
                    <div
                      key={index}
                      className="w-2.5 h-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-sm animate-bounce"
                      style={{
                        animationDelay: `${index * 0.2}s`,
                        animationDuration: "1.5s",
                      }}
                    />
                  ))}
                </div>

                {/* Dynamic message text */}
                <span className="text-sm font-medium text-slate-700">
                  {currentMessage}
                </span>
              </div>

              {/* Progress indicator for long tasks */}
              {isLongTask && (
                <div className="mt-3 pt-3 border-t border-purple-200/50">
                  <div className="flex items-center space-x-2 text-xs text-slate-600">
                    <span>✨</span>
                    <span>
                      Large conversation detected - processing with enhanced AI
                    </span>
                  </div>

                  {/* Animated progress bar */}
                  <div className="mt-2 w-full bg-purple-100 rounded-full h-1 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              )}
            </div>

            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl rounded-tl-lg pointer-events-none" />

            {/* Subtle top highlight */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;

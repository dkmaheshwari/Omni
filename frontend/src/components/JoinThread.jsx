// frontend/src/components/JoinThread.jsx

import React, { useState } from "react";
import { useThread } from "../contexts/ThreadContext";

export default function JoinThread() {
  const [threadId, setThreadId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { joinThread } = useThread();

  const handleJoin = async () => {
    if (!threadId.trim()) {
      setError("Please enter a thread ID");
      return;
    }

    // Basic validation for MongoDB ObjectID format
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(threadId.trim())) {
      setError("Invalid thread ID format. Please check the ID and try again.");
      return;
    }

    setIsJoining(true);
    setError("");
    setSuccessMessage("");

    try {
      const thread = await joinThread(threadId.trim());
      setThreadId("");
      setError("");
      setSuccessMessage(`Successfully joined "${thread.title}"!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      if (err.message.includes("Thread not found")) {
        setError("Thread not found. Please check the ID and try again.");
      } else if (err.message.includes("already in thread")) {
        setError("You're already a member of this thread.");
      } else {
        setError(err.message || "Failed to join thread");
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg p-6 mb-6">
      <h3 className="font-semibold text-slate-900 mb-2 flex items-center space-x-2">
        <span>🔗</span>
        <span>Join Thread</span>
      </h3>
      
      <p className="text-xs text-slate-500 mb-4">
        Ask a friend to share their thread ID using the "📋 Share" button, then paste it below to join their discussion.
      </p>
      
      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={threadId}
            onChange={(e) => setThreadId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleJoin();
              }
            }}
            placeholder="Paste thread ID here... (e.g., 686c9559d14ee8507503433f)"
            disabled={isJoining}
            className="w-full px-4 py-3 bg-white/90 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm font-mono"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-600">{successMessage}</p>
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={isJoining || !threadId.trim()}
          className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
            isJoining || !threadId.trim()
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          }`}
        >
          {isJoining ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Joining...</span>
            </div>
          ) : (
            "Join Thread"
          )}
        </button>
      </div>
    </div>
  );
}
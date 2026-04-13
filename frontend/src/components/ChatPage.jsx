// src/pages/ChatPage.jsx
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useThread } from "../contexts/ThreadContext";
import { useMessage } from "../contexts/MessageContext";

export default function ChatPage() {
  const { logout } = useAuth();
  const {
    threads,
    selectedThread,
    setSelectedThread,
    fetchThreads,
    createThread,
  } = useThread();
  const {
    messages,
    setMessages,
    fetchMessages,
    sendMessage,
    newMessage,
    setNewMessage,
  } = useMessage();

  const [newThreadTitle, setNewThreadTitle] = useState("");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-100 p-4 border-r">
        <button onClick={logout} className="text-red-500 mb-4">
          Logout
        </button>

        <div className="mb-4">
          <h2 className="font-semibold mb-1">Create New Thread</h2>
          <input
            type="text"
            placeholder="Thread title"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.target.value)}
            className="w-full p-2 border rounded mb-1"
          />
          <button
            onClick={async () => {
              await createThread(newThreadTitle);
              setNewThreadTitle("");
            }}
            className="w-full bg-green-500 text-white p-2 rounded"
          >
            + New
          </button>
        </div>

        <h2 className="font-semibold mb-2">Threads</h2>
        <ul className="space-y-2">
          {threads.map((thread) => (
            <li
              key={thread._id}
              onClick={async () => {
                setSelectedThread(thread);
                await fetchMessages(thread._id);
              }}
              className={`p-2 border rounded cursor-pointer ${
                selectedThread?._id === thread._id
                  ? "bg-blue-200"
                  : "hover:bg-gray-200"
              }`}
            >
              {thread.title}
            </li>
          ))}
        </ul>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-2">
          {selectedThread ? selectedThread.title : "Select a thread"}
        </h2>

        <div className="flex-1 overflow-y-auto border rounded p-2 mb-2 bg-white">
          {messages.map((msg, i) => (
            <div key={i} className="mb-2">
              <strong>{msg.sender}</strong>: {msg.text}
            </div>
          ))}
        </div>

        {selectedThread && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await sendMessage(selectedThread._id, newMessage);
              setNewMessage("");
              await fetchMessages(selectedThread._id);
            }}
            className="flex"
          >
            <input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 p-2 border rounded-l"
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 rounded-r"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

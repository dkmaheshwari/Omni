import { useEffect } from "react";
import axios from "../axios";
import { useThread } from "../contexts/ThreadContext";
import { useMessages } from "../contexts/MessageContext";

function ThreadSelector() {
  const { threads, setThreads, selectedThread, setSelectedThread } =
    useThread();
  const { setMessages } = useMessages();

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await axios.get("/threads");
        setThreads(res.data);
      } catch (err) {
        console.error("Failed to fetch threads:", err);
      }
    };
    fetchThreads();
  }, [setThreads]);

  const selectThread = async (thread) => {
    setSelectedThread(thread);
    try {
      const res = await axios.get(`/messages?threadId=${thread._id}`);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  return (
    <div className="w-64 border-r h-screen p-4 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Threads</h2>
      {threads.map((thread) => (
        <div
          key={thread._id}
          className={`p-2 cursor-pointer rounded ${
            selectedThread?._id === thread._id
              ? "bg-blue-200"
              : "hover:bg-gray-100"
          }`}
          onClick={() => selectThread(thread)}
        >
          {thread.title}
        </div>
      ))}
    </div>
  );
}

export default ThreadSelector;

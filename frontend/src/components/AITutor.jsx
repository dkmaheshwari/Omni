// AI Tutor Component - Main AI tutoring interface
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../axios';

const AITutor = () => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tutorSettings, setTutorSettings] = useState({
    subject: '',
    difficulty: 'intermediate',
    learningStyle: 'visual'
  });
  const [sessionActive, setSessionActive] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startTutoringSession = async () => {
    if (!tutorSettings.subject) {
      alert('Please select a subject to start tutoring');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('/ai/tutor/session', {
        subject: tutorSettings.subject,
        difficulty: tutorSettings.difficulty,
        goals: [`Learn ${tutorSettings.subject} effectively`]
      });

      if (response.data.success) {
        setSessionId(response.data.sessionId);
        setSessionActive(true);
        setMessages([{
          id: Date.now(),
          type: 'ai',
          content: response.data.response,
          timestamp: new Date()
        }]);
        setSuggestions(response.data.recommendations || []);
      }
    } catch (error) {
      console.error('Error starting tutoring session:', error);
      alert('Failed to start tutoring session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !sessionId) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post('/ai/tutor/question', {
        question: currentMessage,
        sessionId: sessionId,
        context: messages.slice(-5).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      });

      if (response.data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: response.data.response,
          timestamp: new Date(),
          interactionId: response.data.interactionId
        };

        setMessages(prev => [...prev, aiMessage]);
        setSuggestions(response.data.suggestions || []);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setCurrentMessage(suggestion);
  };

  const provideFeedback = async (messageId, rating, helpful) => {
    try {
      const message = messages.find(msg => msg.id === messageId);
      if (!message || !message.interactionId) return;

      await axios.post('/ai/tutor/feedback', {
        interactionId: message.interactionId,
        feedback: {
          rating,
          helpful,
          feedbackDate: new Date()
        }
      });
    } catch (error) {
      console.error('Error providing feedback:', error);
    }
  };

  const endSession = () => {
    setSessionActive(false);
    setSessionId(null);
    setMessages([]);
    setSuggestions([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">AI Tutor</h2>
        
        {!sessionActive && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-semibold mb-3">Start a Tutoring Session</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  value={tutorSettings.subject}
                  onChange={(e) => setTutorSettings(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a subject</option>
                  <option value="mathematics">Mathematics</option>
                  <option value="physics">Physics</option>
                  <option value="chemistry">Chemistry</option>
                  <option value="biology">Biology</option>
                  <option value="programming">Programming</option>
                  <option value="english">English</option>
                  <option value="history">History</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={tutorSettings.difficulty}
                  onChange={(e) => setTutorSettings(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Learning Style
                </label>
                <select
                  value={tutorSettings.learningStyle}
                  onChange={(e) => setTutorSettings(prev => ({ ...prev, learningStyle: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="visual">Visual</option>
                  <option value="auditory">Auditory</option>
                  <option value="kinesthetic">Kinesthetic</option>
                  <option value="reading-writing">Reading/Writing</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={startTutoringSession}
              disabled={isLoading}
              className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Starting Session...' : 'Start Tutoring Session'}
            </button>
          </div>
        )}
      </div>

      {sessionActive && (
        <div className="border rounded-lg">
          <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
            <div>
              <h3 className="font-semibold text-gray-800">
                {tutorSettings.subject} - {tutorSettings.difficulty} level
              </h3>
              <p className="text-sm text-gray-600">Learning Style: {tutorSettings.learningStyle}</p>
            </div>
            <button
              onClick={endSession}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              End Session
            </button>
          </div>

          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.type === 'error'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                  
                  {message.type === 'ai' && message.interactionId && (
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={() => provideFeedback(message.id, 5, true)}
                        className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded"
                      >
                        👍 Helpful
                      </button>
                      <button
                        onClick={() => provideFeedback(message.id, 2, false)}
                        className="text-xs px-2 py-1 bg-red-200 text-red-800 rounded"
                      >
                        👎 Not Helpful
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {suggestions.length > 0 && (
            <div className="p-4 bg-gray-50 border-t">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggested Questions:</h4>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask your question here..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows="2"
              />
              <button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITutor;
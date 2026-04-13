// frontend/src/pages/LandingPage.jsx

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, loading, navigate]);

  const handleSignUp = () => {
    navigate("/signup");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent)]" />
      
      {/* Header */}
      <header className="relative z-10 w-full px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">🧠</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Omni Nexus
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogin}
              className="px-6 py-2 text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              Log In
            </button>
            <button
              onClick={handleSignUp}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="mb-8">
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50/50 px-4 py-2 text-sm text-blue-700 mb-6">
              <span className="mr-2">✨</span>
              <span>AI-Powered Learning Platform</span>
            </div>
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6 leading-tight">
            Learn Smarter with
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI-Enhanced
            </span>{" "}
            Discussions
          </h2>
          
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            Join collaborative study sessions powered by advanced AI. Create focused discussion threads, 
            get instant intelligent responses, and accelerate your learning with peers and AI assistance.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button
              onClick={handleSignUp}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-lg"
            >
              Get Started Free
            </button>
            <button
              onClick={handleLogin}
              className="px-8 py-4 bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 text-lg"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Feature 1 - AI-Powered Responses */}
          <div className="group bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">AI-Powered Responses</h3>
            <p className="text-slate-600 leading-relaxed">
              Get instant, intelligent answers powered by Groq's Llama 3. Our AI understands context and provides educational insights tailored to your questions.
            </p>
          </div>

          {/* Feature 2 - Threaded Discussions */}
          <div className="group bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Organized Discussions</h3>
            <p className="text-slate-600 leading-relaxed">
              Create focused study threads for different topics. Keep conversations organized and accessible for collaborative learning with peers.
            </p>
          </div>

          {/* Feature 3 - Smart Summaries */}
          <div className="group bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Instant Summaries</h3>
            <p className="text-slate-600 leading-relaxed">
              Generate AI-powered summaries of lengthy discussions. Extract key insights and maintain focus on important learning points.
            </p>
          </div>

          {/* Feature 4 - Secure & Private */}
          <div className="group bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Secure & Private</h3>
            <p className="text-slate-600 leading-relaxed">
              Enterprise-grade security with Firebase authentication. Your discussions and data are protected with industry-standard encryption.
            </p>
          </div>

          {/* Feature 5 - Real-time Collaboration */}
          <div className="group bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Real-time Collaboration</h3>
            <p className="text-slate-600 leading-relaxed">
              Connect with fellow students in real-time. Share knowledge, ask questions, and learn together in a collaborative environment.
            </p>
          </div>

          {/* Feature 6 - Cross-platform */}
          <div className="group bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 bg-gradient-to-tr from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">Cross-Platform Access</h3>
            <p className="text-slate-600 leading-relaxed">
              Access your study sessions from any device. Our responsive design ensures a seamless experience on desktop, tablet, and mobile.
            </p>
          </div>
        </div>

        {/* Call-to-Action Section */}
        <div className="text-center bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-sm border border-white/20 rounded-3xl p-12 shadow-xl">
          <h3 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to Transform Your Learning?
          </h3>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Join thousands of students already using Omni Nexus to enhance their academic discussions with AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button
              onClick={handleSignUp}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 text-lg"
            >
              Start Learning Today
            </button>
            <div className="flex items-center space-x-4 text-sm text-slate-500">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Free to get started</span>
              </div>
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-16 py-8 border-t border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">🧠</span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Omni Nexus
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2024 Omni Nexus. Empowering collaborative learning with AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
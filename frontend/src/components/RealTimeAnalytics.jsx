// Real-time Analytics Component - Live metrics and insights display
import React, { useState, useEffect } from 'react';
import { useAnalytics } from '../contexts/AnalyticsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiActivity, 
  FiClock, 
  FiTrendingUp, 
  FiZap, 
  FiCpu, 
  FiTarget,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiAward
} from 'react-icons/fi';

const RealTimeAnalytics = ({ isMinimized = false }) => {
  const {
    realTimeMetrics,
    sessionMetrics,
    insights,
    isTracking,
    currentSession,
    calculateProductivityScore,
    calculateEngagementScore,
    generateRecommendations,
    getSessionDuration
  } = useAnalytics();

  const [showInsights, setShowInsights] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Format time duration
  const formatDuration = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Real-time metrics cards
  const MetricCard = ({ icon: Icon, title, value, subtitle, color = 'blue', trend }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-white p-4 rounded-lg shadow-md border-l-4 border-l-${color}-500`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className={`w-8 h-8 text-${color}-500`} />
          <div>
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        {trend && (
          <div className={`text-xs px-2 py-1 rounded-full ${
            trend > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {trend > 0 ? '↗' : '↘'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </motion.div>
  );

  // Engagement ring component
  const EngagementRing = ({ score, size = 120 }) => {
    const radius = (size - 20) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getColor = (score) => {
      if (score >= 80) return '#10b981'; // green
      if (score >= 60) return '#f59e0b'; // yellow
      if (score >= 40) return '#f97316'; // orange
      return '#ef4444'; // red
    };

    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor(score)}
            strokeWidth="8"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{score}%</div>
            <div className="text-xs text-gray-500">Engagement</div>
          </div>
        </div>
      </div>
    );
  };

  // Insight component
  const InsightCard = ({ insight }) => {
    const getInsightIcon = (type) => {
      switch (type) {
        case 'success':
        case 'achievement':
          return <FiCheckCircle className="w-5 h-5 text-green-500" />;
        case 'warning':
          return <FiAlertCircle className="w-5 h-5 text-yellow-500" />;
        case 'info':
          return <FiInfo className="w-5 h-5 text-blue-500" />;
        case 'engagement':
          return <FiZap className="w-5 h-5 text-purple-500" />;
        default:
          return <FiInfo className="w-5 h-5 text-gray-500" />;
      }
    };

    const getInsightColor = (type) => {
      switch (type) {
        case 'success':
        case 'achievement':
          return 'bg-green-50 border-green-200';
        case 'warning':
          return 'bg-yellow-50 border-yellow-200';
        case 'info':
          return 'bg-blue-50 border-blue-200';
        case 'engagement':
          return 'bg-purple-50 border-purple-200';
        default:
          return 'bg-gray-50 border-gray-200';
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`p-3 rounded-lg border ${getInsightColor(insight.type)}`}
      >
        <div className="flex items-start space-x-3">
          {getInsightIcon(insight.type)}
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-800">{insight.title}</h4>
            <p className="text-xs text-gray-600 mt-1">{insight.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(insight.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  // Recommendation component
  const RecommendationCard = ({ recommendation }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-3 rounded-lg border-l-4 ${
        recommendation.priority === 'high' ? 'border-l-red-500 bg-red-50' :
        recommendation.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
        'border-l-green-500 bg-green-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-800">{recommendation.title}</h4>
          <p className="text-xs text-gray-600 mt-1">{recommendation.message}</p>
          {recommendation.action && (
            <p className="text-xs text-gray-500 mt-2 italic">💡 {recommendation.action}</p>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
          recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {recommendation.priority}
        </span>
      </div>
    </motion.div>
  );

  // Minimized view
  if (isMinimized) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50"
      >
        <div className="flex items-center space-x-4">
          <EngagementRing score={calculateEngagementScore()} size={60} />
          <div>
            <div className="text-sm font-medium text-gray-800">
              {formatDuration(getSessionDuration())}
            </div>
            <div className="text-xs text-gray-500">Session time</div>
          </div>
          <div className="text-sm font-medium text-gray-800">
            {calculateProductivityScore()}%
          </div>
        </div>
      </motion.div>
    );
  }

  if (!isTracking) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="text-center">
          <FiActivity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Analytics Not Active</h3>
          <p className="text-gray-500">Start a study session to see real-time analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Real-time Analytics</h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600">Live</span>
        </div>
      </div>

      {/* Main metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={FiClock}
          title="Session Time"
          value={formatDuration(getSessionDuration())}
          subtitle="Current session"
          color="blue"
        />
        <MetricCard
          icon={FiCpu}
          title="AI Interactions"
          value={realTimeMetrics.aiInteractions || 0}
          subtitle="Questions asked"
          color="purple"
        />
        <MetricCard
          icon={FiTrendingUp}
          title="Learning Progress"
          value={`${Math.round(realTimeMetrics.learningProgress || 0)}%`}
          subtitle="Improvement rate"
          color="green"
        />
        <MetricCard
          icon={FiTarget}
          title="Productivity"
          value={`${calculateProductivityScore()}%`}
          subtitle="Overall score"
          color="orange"
        />
      </div>

      {/* Engagement and activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement ring */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Engagement Level</h3>
            <FiZap className="w-5 h-5 text-purple-500" />
          </div>
          <div className="flex items-center justify-center">
            <EngagementRing score={calculateEngagementScore()} />
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              {realTimeMetrics.activitiesCount || 0} activities tracked
            </p>
          </div>
        </div>

        {/* Activity breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Activity Breakdown</h3>
            <FiActivity className="w-5 h-5 text-blue-500" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Focus Time</span>
              <span className="text-sm font-medium text-gray-800">
                {formatDuration(sessionMetrics.focusTime || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Break Time</span>
              <span className="text-sm font-medium text-gray-800">
                {formatDuration(sessionMetrics.breakTime || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Activities</span>
              <span className="text-sm font-medium text-gray-800">
                {realTimeMetrics.activitiesCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights and recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Live Insights</h3>
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showInsights ? 'Hide' : 'Show'}
            </button>
          </div>
          <AnimatePresence>
            {showInsights && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 max-h-64 overflow-y-auto"
              >
                {insights.length > 0 ? (
                  insights.slice(-5).map((insight) => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No insights yet. Keep studying to generate insights!
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recommendations */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recommendations</h3>
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showRecommendations ? 'Hide' : 'Show'}
            </button>
          </div>
          <AnimatePresence>
            {showRecommendations && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 max-h-64 overflow-y-auto"
              >
                {generateRecommendations().map((recommendation) => (
                  <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Session summary */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{formatDuration(getSessionDuration())}</div>
            <div className="text-sm text-gray-500">Study Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{realTimeMetrics.aiInteractions || 0}</div>
            <div className="text-sm text-gray-500">AI Helps</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{calculateEngagementScore()}%</div>
            <div className="text-sm text-gray-500">Engagement</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{calculateProductivityScore()}%</div>
            <div className="text-sm text-gray-500">Productivity</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeAnalytics;
// Analytics Dashboard Component - User performance and progress visualization
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../axios';

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [learningProfile, setLearningProfile] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [engagementStats, setEngagementStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [
        analyticsResponse,
        profileResponse,
        performanceResponse,
        engagementResponse
      ] = await Promise.all([
        axios.get(`/analytics/report?period=${selectedPeriod}`),
        axios.get('/analytics/learning-profile'),
        axios.get('/analytics/performance'),
        axios.get('/analytics/engagement')
      ]);

      setAnalytics(analyticsResponse.data.success ? analyticsResponse.data.report : null);
      setLearningProfile(profileResponse.data.success ? profileResponse.data.profile : null);
      setPerformanceMetrics(performanceResponse.data.success ? performanceResponse.data.metrics : null);
      setEngagementStats(engagementResponse.data.success ? engagementResponse.data.engagement : null);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const detectLearningStyle = async () => {
    try {
      const response = await axios.post('/analytics/detect-learning-style');
      if (response.data.success) {
        setLearningProfile(prev => ({
          ...prev,
          learningStyle: response.data.learningStyle
        }));
        alert(`Learning style detected: ${response.data.learningStyle}`);
      }
    } catch (error) {
      console.error('Error detecting learning style:', error);
      alert('Failed to detect learning style. Please try again.');
    }
  };

  const StatCard = ({ title, value, subtitle, color = 'blue' }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-l-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const ProgressBar = ({ label, value, maxValue = 100, color = 'blue' }) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`bg-${color}-600 h-2 rounded-full transition-all duration-300`}
          style={{ width: `${(value / maxValue) * 100}%` }}
        ></div>
      </div>
    </div>
  );

  const TabButton = ({ id, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h2>
        <div className="flex space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
          <button
            onClick={detectLearningStyle}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Detect Learning Style
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6">
        <TabButton
          id="overview"
          label="Overview"
          isActive={activeTab === 'overview'}
          onClick={setActiveTab}
        />
        <TabButton
          id="performance"
          label="Performance"
          isActive={activeTab === 'performance'}
          onClick={setActiveTab}
        />
        <TabButton
          id="engagement"
          label="Engagement"
          isActive={activeTab === 'engagement'}
          onClick={setActiveTab}
        />
        <TabButton
          id="learning"
          label="Learning Profile"
          isActive={activeTab === 'learning'}
          onClick={setActiveTab}
        />
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Overall Score"
              value={`${performanceMetrics?.overall?.score || 0}%`}
              subtitle="Performance rating"
            />
            <StatCard
              title="Study Time"
              value={`${Math.round((engagementStats?.summary?.totalStudyTime || 0) / 3600)}h`}
              subtitle="Total hours studied"
            />
            <StatCard
              title="AI Interactions"
              value={analytics?.metrics?.aiInteraction?.totalInteractions || 0}
              subtitle="Questions asked"
            />
            <StatCard
              title="Engagement"
              value={`${Math.round(engagementStats?.summary?.averageEngagementScore || 0)}%`}
              subtitle="Average engagement"
            />
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
            {performanceMetrics?.recentActivity?.length > 0 ? (
              <div className="space-y-3">
                {performanceMetrics.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{activity.type}</p>
                      <p className="text-sm text-gray-600">{activity.subject}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </p>
                      {activity.satisfaction && (
                        <div className="flex items-center">
                          <span className="text-yellow-500">{'★'.repeat(activity.satisfaction)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No recent activity</p>
            )}
          </div>

          {/* Insights */}
          {analytics?.insights?.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Insights</h3>
              <div className="space-y-3">
                {analytics.insights.map((insight, index) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    insight.type === 'achievement' ? 'bg-green-50 border border-green-200' :
                    insight.type === 'concern' ? 'bg-red-50 border border-red-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <h4 className="font-medium text-gray-800">{insight.title}</h4>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Subject Performance */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Subject Performance</h3>
            {performanceMetrics?.subjects?.length > 0 ? (
              <div className="space-y-4">
                {performanceMetrics.subjects.map((subject, index) => (
                  <ProgressBar
                    key={index}
                    label={subject.subject}
                    value={subject.score}
                    color="blue"
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No subject performance data available</p>
            )}
          </div>

          {/* Learning Goals */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Learning Goals</h3>
            {performanceMetrics?.learningGoals?.length > 0 ? (
              <div className="space-y-4">
                {performanceMetrics.learningGoals.map((goal, index) => (
                  <div key={index} className="border-l-4 border-l-blue-500 pl-4">
                    <h4 className="font-medium text-gray-800">{goal.goal}</h4>
                    <p className="text-sm text-gray-600 mb-2">{goal.subject}</p>
                    <ProgressBar
                      label={`Progress (${goal.daysRemaining} days remaining)`}
                      value={goal.progress}
                      color="green"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No learning goals set</p>
            )}
          </div>

          {/* Recommendations */}
          {performanceMetrics?.recommendations?.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
              <div className="space-y-3">
                {performanceMetrics.recommendations.map((rec, index) => (
                  <div key={index} className={`p-3 rounded-lg border-l-4 ${
                    rec.priority === 'high' ? 'border-l-red-500 bg-red-50' :
                    rec.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                    'border-l-green-500 bg-green-50'
                  }`}>
                    <h4 className="font-medium text-gray-800">{rec.title}</h4>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Engagement Tab */}
      {activeTab === 'engagement' && (
        <div className="space-y-6">
          {/* Engagement Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Sessions"
              value={engagementStats?.summary?.sessionsCompleted || 0}
              subtitle="Study sessions"
            />
            <StatCard
              title="Average Session"
              value={`${Math.round((engagementStats?.summary?.totalStudyTime || 0) / (engagementStats?.summary?.sessionsCompleted || 1) / 60)}m`}
              subtitle="Minutes per session"
            />
            <StatCard
              title="Last Active"
              value={engagementStats?.summary?.lastActiveDate ? 
                new Date(engagementStats.summary.lastActiveDate).toLocaleDateString() : 'N/A'}
              subtitle="Last study session"
            />
          </div>

          {/* Engagement Insights */}
          {engagementStats?.insights?.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Engagement Insights</h3>
              <div className="space-y-3">
                {engagementStats.insights.map((insight, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-800">{insight.message}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        insight.trend === 'excellent' ? 'bg-green-100 text-green-800' :
                        insight.trend === 'good' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {insight.trend}
                      </span>
                      <span className="text-sm text-gray-500">{insight.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Engagement Recommendations */}
          {engagementStats?.recommendations?.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4">Engagement Recommendations</h3>
              <div className="space-y-3">
                {engagementStats.recommendations.map((rec, index) => (
                  <div key={index} className="p-3 border-l-4 border-l-blue-500 bg-blue-50">
                    <h4 className="font-medium text-gray-800">{rec.title}</h4>
                    <p className="text-sm text-gray-600">{rec.description}</p>
                    <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {rec.priority} priority
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Learning Profile Tab */}
      {activeTab === 'learning' && (
        <div className="space-y-6">
          {/* Learning Style */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Learning Style</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600 capitalize">
                  {learningProfile?.learningStyle || 'Not detected'}
                </p>
                <p className="text-gray-600">Your preferred learning style</p>
              </div>
              <button
                onClick={detectLearningStyle}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Re-detect Style
              </button>
            </div>
          </div>

          {/* Strengths and Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-green-600">Strengths</h3>
              {learningProfile?.strengths?.length > 0 ? (
                <div className="space-y-2">
                  {learningProfile.strengths.map((strength, index) => (
                    <div key={index} className="p-2 bg-green-50 rounded-lg">
                      <p className="font-medium text-green-800">{strength.category}</p>
                      <p className="text-sm text-green-600">{strength.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No strengths identified yet</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-4 text-red-600">Areas for Improvement</h3>
              {learningProfile?.weaknesses?.length > 0 ? (
                <div className="space-y-2">
                  {learningProfile.weaknesses.map((weakness, index) => (
                    <div key={index} className="p-2 bg-red-50 rounded-lg">
                      <p className="font-medium text-red-800">{weakness.category}</p>
                      <p className="text-sm text-red-600">{weakness.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No areas for improvement identified</p>
              )}
            </div>
          </div>

          {/* Preferred Subjects */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Preferred Subjects</h3>
            {learningProfile?.preferredSubjects?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {learningProfile.preferredSubjects.map((subject, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No preferred subjects identified</p>
            )}
          </div>

          {/* Tutor Preferences */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Tutor Preferences</h3>
            {learningProfile?.tutorPreferences && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Explanation Style</p>
                  <p className="text-lg text-gray-900 capitalize">
                    {learningProfile.tutorPreferences.explanationStyle}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Feedback Frequency</p>
                  <p className="text-lg text-gray-900 capitalize">
                    {learningProfile.tutorPreferences.feedbackFrequency}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Challenge Level</p>
                  <p className="text-lg text-gray-900 capitalize">
                    {learningProfile.tutorPreferences.challengeLevel}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
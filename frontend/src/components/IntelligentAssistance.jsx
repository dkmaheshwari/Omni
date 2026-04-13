// Intelligent Assistance Component - AI-powered assistance for various tasks
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../axios';

// TabButton component moved outside to prevent re-creation
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

// FormField component moved outside to prevent re-creation
const FormField = ({ label, type = 'text', value, onChange, placeholder, options = null, rows = 4 }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    {type === 'select' ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : type === 'textarea' ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
        rows={rows}
      />
    ) : type === 'checkbox' ? (
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="mr-2"
        />
        <span className="text-gray-700">{placeholder}</span>
      </div>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    )}
  </div>
);

const IntelligentAssistance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('code-review');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Code Review Form
  const [codeReviewForm, setCodeReviewForm] = useState({
    code: '',
    language: 'javascript',
    focusAreas: []
  });

  // Writing Assistance Form
  const [writingForm, setWritingForm] = useState({
    text: '',
    assistanceType: 'grammar',
    writingType: 'general'
  });

  // Math Solving Form
  const [mathForm, setMathForm] = useState({
    problem: '',
    showSteps: true,
    mathType: 'algebra'
  });

  // Research Assistance Form
  const [researchForm, setResearchForm] = useState({
    topic: '',
    sources: 'academic',
    depth: 'moderate',
    researchType: 'general'
  });

  useEffect(() => {
    fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await axios.get(`/ai/assist/history?type=${getHistoryType(activeTab)}`);
      if (response.data.success) {
        setHistory(response.data.history);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getHistoryType = (tab) => {
    const mapping = {
      'code-review': 'code_review',
      'writing': 'writing_assistance',
      'math': 'math_solving',
      'research': 'research_assistance'
    };
    return mapping[tab] || tab;
  };

  const handleCodeReview = async () => {
    if (!codeReviewForm.code.trim()) {
      alert('Please enter code to review');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post('/ai/assist/code-review', {
        code: codeReviewForm.code,
        language: codeReviewForm.language,
        focusAreas: codeReviewForm.focusAreas
      });

      if (response.data.success) {
        setResult({
          type: 'code-review',
          data: response.data.review
        });
        fetchHistory();
      }
    } catch (error) {
      console.error('Error reviewing code:', error);
      alert('Failed to review code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWritingAssistance = async () => {
    if (!writingForm.text.trim()) {
      alert('Please enter text for writing assistance');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post('/ai/assist/writing-assistance', {
        text: writingForm.text,
        assistanceType: writingForm.assistanceType,
        writingType: writingForm.writingType
      });

      if (response.data.success) {
        setResult({
          type: 'writing',
          data: response.data.assistance
        });
        fetchHistory();
      }
    } catch (error) {
      console.error('Error with writing assistance:', error);
      alert('Failed to provide writing assistance. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMathSolving = async () => {
    if (!mathForm.problem.trim()) {
      alert('Please enter a math problem to solve');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post('/ai/assist/math-solving', {
        problem: mathForm.problem,
        showSteps: mathForm.showSteps,
        mathType: mathForm.mathType
      });

      if (response.data.success) {
        setResult({
          type: 'math',
          data: response.data.solution
        });
        fetchHistory();
      }
    } catch (error) {
      console.error('Error solving math problem:', error);
      alert('Failed to solve math problem. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResearchAssistance = async () => {
    if (!researchForm.topic.trim()) {
      alert('Please enter a research topic');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await axios.post('/ai/assist/research-assistance', {
        topic: researchForm.topic,
        sources: researchForm.sources,
        depth: researchForm.depth,
        researchType: researchForm.researchType
      });

      if (response.data.success) {
        setResult({
          type: 'research',
          data: response.data.research
        });
        fetchHistory();
      }
    } catch (error) {
      console.error('Error with research assistance:', error);
      alert('Failed to provide research assistance. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  const renderResult = () => {
    if (!result) return null;

    const { type, data } = result;

    switch (type) {
      case 'code-review':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Code Review Results</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Language:</span>
                <span className="text-sm text-gray-600">{data.language}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Code Length:</span>
                <span className="text-sm text-gray-600">{data.codeLength} characters</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Severity:</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  data.severity === 'high' ? 'bg-red-100 text-red-800' :
                  data.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {data.severity}
                </span>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-800 mb-2">Review:</h4>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap">{data.review}</div>
                </div>
              </div>
              {data.suggestions.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Key Suggestions:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {data.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      case 'writing':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Writing Assistance Results</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Assistance Type:</span>
                <span className="text-sm text-gray-600">{data.assistanceType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Original Length:</span>
                <span className="text-sm text-gray-600">{data.originalLength} characters</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Writing Score:</span>
                <span className="text-sm text-gray-600">{data.score}/100</span>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-800 mb-2">Suggestions:</h4>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap">{data.suggestions}</div>
                </div>
              </div>
              {data.improvements.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Key Improvements:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {data.improvements.map((improvement, index) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      case 'math':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Math Solution</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Problem:</h4>
                <p className="text-gray-700">{data.problem}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Difficulty:</span>
                <span className={`text-sm px-2 py-1 rounded-full ${
                  data.difficulty === 'advanced' ? 'bg-red-100 text-red-800' :
                  data.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {data.difficulty}
                </span>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-800 mb-2">Solution:</h4>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap">{data.solution}</div>
                </div>
              </div>
              {data.steps.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Solution Steps:</h4>
                  <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                    {data.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {data.concepts.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Key Concepts:</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.concepts.map((concept, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'research':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Research Assistance</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Topic:</h4>
                <p className="text-gray-700">{data.topic}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Sources:</span>
                <span className="text-sm text-gray-600">{data.sources}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Depth:</span>
                <span className="text-sm text-gray-600">{data.depth}</span>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-800 mb-2">Research Guidance:</h4>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap">{data.guidance}</div>
                </div>
              </div>
              {data.keyPoints.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Key Points:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {data.keyPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.nextSteps.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-800 mb-2">Next Steps:</h4>
                  <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                    {data.nextSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Intelligent Assistance</h2>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6">
        <TabButton
          id="code-review"
          label="Code Review"
          isActive={activeTab === 'code-review'}
          onClick={setActiveTab}
        />
        <TabButton
          id="writing"
          label="Writing Help"
          isActive={activeTab === 'writing'}
          onClick={setActiveTab}
        />
        <TabButton
          id="math"
          label="Math Solving"
          isActive={activeTab === 'math'}
          onClick={setActiveTab}
        />
        <TabButton
          id="research"
          label="Research Help"
          isActive={activeTab === 'research'}
          onClick={setActiveTab}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">
              {activeTab === 'code-review' && 'Code Review'}
              {activeTab === 'writing' && 'Writing Assistance'}
              {activeTab === 'math' && 'Math Problem Solving'}
              {activeTab === 'research' && 'Research Assistance'}
            </h3>

            {activeTab === 'code-review' && (
              <div>
                <FormField
                  label="Programming Language"
                  type="select"
                  value={codeReviewForm.language}
                  onChange={(value) => setCodeReviewForm(prev => ({ ...prev, language: value }))}
                  options={[
                    { value: 'javascript', label: 'JavaScript' },
                    { value: 'python', label: 'Python' },
                    { value: 'java', label: 'Java' },
                    { value: 'cpp', label: 'C++' },
                    { value: 'html', label: 'HTML' },
                    { value: 'css', label: 'CSS' },
                    { value: 'react', label: 'React' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
                <FormField
                  label="Code"
                  type="textarea"
                  value={codeReviewForm.code}
                  onChange={(value) => setCodeReviewForm(prev => ({ ...prev, code: value }))}
                  placeholder="Paste your code here..."
                  rows={12}
                />
                <button
                  onClick={handleCodeReview}
                  disabled={isProcessing}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Reviewing...' : 'Review Code'}
                </button>
              </div>
            )}

            {activeTab === 'writing' && (
              <div>
                <FormField
                  label="Assistance Type"
                  type="select"
                  value={writingForm.assistanceType}
                  onChange={(value) => setWritingForm(prev => ({ ...prev, assistanceType: value }))}
                  options={[
                    { value: 'grammar', label: 'Grammar & Spelling' },
                    { value: 'style', label: 'Style & Clarity' },
                    { value: 'structure', label: 'Structure & Flow' },
                    { value: 'comprehensive', label: 'Comprehensive Review' }
                  ]}
                />
                <FormField
                  label="Writing Type"
                  type="select"
                  value={writingForm.writingType}
                  onChange={(value) => setWritingForm(prev => ({ ...prev, writingType: value }))}
                  options={[
                    { value: 'general', label: 'General Writing' },
                    { value: 'academic', label: 'Academic Writing' },
                    { value: 'creative', label: 'Creative Writing' },
                    { value: 'business', label: 'Business Writing' }
                  ]}
                />
                <FormField
                  label="Text"
                  type="textarea"
                  value={writingForm.text}
                  onChange={(value) => setWritingForm(prev => ({ ...prev, text: value }))}
                  placeholder="Enter your text here..."
                  rows={8}
                />
                <button
                  onClick={handleWritingAssistance}
                  disabled={isProcessing}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Analyzing...' : 'Get Writing Help'}
                </button>
              </div>
            )}

            {activeTab === 'math' && (
              <div>
                <FormField
                  label="Math Type"
                  type="select"
                  value={mathForm.mathType}
                  onChange={(value) => setMathForm(prev => ({ ...prev, mathType: value }))}
                  options={[
                    { value: 'algebra', label: 'Algebra' },
                    { value: 'calculus', label: 'Calculus' },
                    { value: 'geometry', label: 'Geometry' },
                    { value: 'statistics', label: 'Statistics' },
                    { value: 'trigonometry', label: 'Trigonometry' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
                <FormField
                  label="Problem"
                  type="textarea"
                  value={mathForm.problem}
                  onChange={(value) => setMathForm(prev => ({ ...prev, problem: value }))}
                  placeholder="Enter your math problem here..."
                  rows={6}
                />
                <FormField
                  label=""
                  type="checkbox"
                  value={mathForm.showSteps}
                  onChange={(value) => setMathForm(prev => ({ ...prev, showSteps: value }))}
                  placeholder="Show step-by-step solution"
                />
                <button
                  onClick={handleMathSolving}
                  disabled={isProcessing}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Solving...' : 'Solve Problem'}
                </button>
              </div>
            )}

            {activeTab === 'research' && (
              <div>
                <FormField
                  label="Research Topic"
                  value={researchForm.topic}
                  onChange={(value) => setResearchForm(prev => ({ ...prev, topic: value }))}
                  placeholder="Enter your research topic..."
                />
                <FormField
                  label="Sources"
                  type="select"
                  value={researchForm.sources}
                  onChange={(value) => setResearchForm(prev => ({ ...prev, sources: value }))}
                  options={[
                    { value: 'academic', label: 'Academic Sources' },
                    { value: 'general', label: 'General Sources' },
                    { value: 'books', label: 'Books & Literature' },
                    { value: 'journals', label: 'Journals & Papers' }
                  ]}
                />
                <FormField
                  label="Research Depth"
                  type="select"
                  value={researchForm.depth}
                  onChange={(value) => setResearchForm(prev => ({ ...prev, depth: value }))}
                  options={[
                    { value: 'basic', label: 'Basic Overview' },
                    { value: 'moderate', label: 'Moderate Detail' },
                    { value: 'comprehensive', label: 'Comprehensive' }
                  ]}
                />
                <button
                  onClick={handleResearchAssistance}
                  disabled={isProcessing}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Researching...' : 'Get Research Help'}
                </button>
              </div>
            )}

            {/* History */}
            <div className="mt-6 border-t pt-4">
              <h4 className="font-medium text-gray-800 mb-2">Recent History</h4>
              {isLoadingHistory ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : history.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {history.map((item, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <p className="text-gray-700 truncate">{item.preview}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-gray-500">{item.subject}</span>
                        <div className="flex items-center space-x-2">
                          {item.rating && (
                            <span className="text-yellow-500">{'★'.repeat(item.rating)}</span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No history available</p>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          <h3 className="text-xl font-semibold mb-4">Results</h3>
          {isProcessing ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : result ? (
            renderResult()
          ) : (
            <div className="bg-gray-50 p-8 rounded-lg text-center">
              <p className="text-gray-500">Fill out the form and submit to get assistance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntelligentAssistance;
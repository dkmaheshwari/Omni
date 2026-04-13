// Debug panel to test backend connectivity
import React, { useState } from 'react';
import axios from '../axios';

export default function DebugPanel() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [authTestStatus, setAuthTestStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const testHealth = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/health');
      setHealthStatus({ success: true, data: response.data });
    } catch (error) {
      setHealthStatus({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const testAuth = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/threads');
      setAuthTestStatus({ success: true, data: response.data });
    } catch (error) {
      setAuthTestStatus({ success: false, error: error.message, details: error.response?.data });
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md">
      <h3 className="font-bold text-lg mb-3">Debug Panel</h3>
      
      <div className="space-y-3">
        <div>
          <button 
            onClick={testHealth}
            disabled={loading}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test Health
          </button>
          {healthStatus && (
            <div className={`mt-1 p-2 rounded text-sm ${healthStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {healthStatus.success ? 'Health OK' : `Error: ${healthStatus.error}`}
            </div>
          )}
        </div>

        <div>
          <button 
            onClick={testAuth}
            disabled={loading}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test Auth
          </button>
          {authTestStatus && (
            <div className={`mt-1 p-2 rounded text-sm ${authTestStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {authTestStatus.success ? 'Auth OK' : `Error: ${authTestStatus.error}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
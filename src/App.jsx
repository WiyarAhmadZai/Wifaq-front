import { useState, useEffect } from 'react';
import api, { get, post } from './api/axios';

function App() {
  const [testMessage, setTestMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Example: Test API connection
  const testApi = async () => {
    setLoading(true);
    try {
      const response = await get('/test');
      setTestMessage(response.data.message);
    } catch (error) {
      setTestMessage('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold text-blue-600 mb-4 text-center">
          Wifaq Schools
        </h1>
        <p className="text-gray-700 text-center mb-6">
          React + Vite + Tailwind CSS + Laravel Sanctum
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="font-semibold text-gray-800 mb-2">API Test:</h2>
          {loading ? (
            <p className="text-blue-600">Loading...</p>
          ) : (
            <p className="text-green-600 font-medium">{testMessage}</p>
          )}
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p className="font-semibold mb-2">Available API methods:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><code>get('/test')</code> - Test API</li>
            <li><code>post('/register', data)</code> - Register</li>
            <li><code>post('/login', data)</code> - Login</li>
            <li><code>get('/user')</code> - Get user (auth)</li>
            <li><code>post('/logout')</code> - Logout</li>
          </ul>
        </div>

        <button 
          onClick={testApi}
          className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Test API Again
        </button>
      </div>
    </div>
  )
}

export default App

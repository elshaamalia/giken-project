import React, { useState } from 'react';
import { BarChart3, Settings, TrendingUp, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'; 
import NGTrendChart from './NGTrendChart';
import useWebSocket from '../hooks/useWebSocket';
import gikenLogo from '../assets/logo-giken.png';

const Dashboard = ({ onNavigateToAllData }) => {
  // Ambil fungsi 'resetData' dari hook
  const { data, connectionStatus, isConnected, resetData } = useWebSocket('ws://localhost:8080');

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleString('id-ID', { 
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const [currentTime, setCurrentTime] = useState(formatTime());

  // Update time setiap detik
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fungsi konfirmasi dan panggil resetData dari hook
  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all dashboard data?')) {
      resetData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <img src={gikenLogo} alt="Giken Precision Logo" className="h-16 w-auto" />
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <span className="text-md text-gray-600">Line / Model</span>
            </div>
            <p className="font-semibold text-gray-900">Line A - Model X1</p>
          </div>
          
          <div className="text-right">
            <div className="flex items-center space-x-4">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 live-indicator' : 'bg-red-500'}`}></div>
              <span className="text-md text-gray-600">{isConnected ? 'Live' : 'Disconnected'}</span>
            </div>
            <p className="font-mono text-md text-gray-900">{currentTime}</p>
          </div>
        </div>
      </div>

      {/* Connection Status Alert */}
      {!isConnected && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 font-medium">Connection Status: {connectionStatus}</span>
          </div>
          <p className="text-red-600 text-sm mt-1">Attempting to reconnect to real-time data server...</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-semibold text-gray-900">NG Trend</h2>
                </div>
                {/* === TOMBOL RESET BARU === */}
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reset Data</span>
                </button>
              </div>

              <div className="flex-grow">
                  {data.ngTrendData && data.ngTrendData.length > 0 ? (
                    <NGTrendChart data={data.ngTrendData} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>Waiting for NG trend data...</p>
                        </div>
                    </div>
                  )}
              </div>
            </div>
        </div>

        {/* Stats Cards */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">OK</p>
                    <p className="text-3xl font-bold text-green-600">{data.totalOK}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
              </div>
            </div>

            {/* NG Count */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">NG</p>
                    <p className="text-3xl font-bold text-red-600">{data.totalNG}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
              </div>
            </div>

            {/* Total Parts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Parts</p>
                    <p className="text-3xl font-bold text-blue-600">{data.totalParts}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
              </div>
            </div>

            {/* Average Cycle Time */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Cycle Time</p>
                    <p className="text-3xl font-bold text-orange-600">{data.avgCycleTime}s</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
              </div>
            </div>
        </div>
      </div>

      {/* Current Cycle Time Monitor */}
      <div className="mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-900">Current Cycle Time Monitor</h2>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Current Output: <span className="font-semibold">#{data.currentOutput}</span></span>
              <button 
                onClick={onNavigateToAllData}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>See All</span>
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-md font-semibold text-gray-900">No</th>
                  <th className="text-left py-3 px-4 text-md font-semibold text-gray-900">Start Time</th>
                  <th className="text-left py-3 px-4 text-md font-semibold text-gray-900">End Time</th>
                  <th className="text-left py-3 px-4 text-md font-semibold text-gray-900">Cycle Time (s)</th>
                  <th className="text-left py-3 px-4 text-md font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.latestCycleData ? (
                  <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-md font-medium text-gray-900">{data.latestCycleData.no}</td>
                    <td className="py-3 px-4 text-md text-gray-700">{data.latestCycleData.startTime}</td>
                    <td className="py-3 px-4 text-md text-gray-700">{data.latestCycleData.endTime}</td>
                    <td className="py-3 px-4 text-md font-medium text-gray-900">{data.latestCycleData.cycleTime}</td>
                    <td className="py-3 px-4">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          data.latestCycleData.status === 'OK' 
                            ? 'bg-green-100 text-green-800 status-ok' 
                            : 'bg-red-100 text-red-800 status-ng'
                        }`}
                      >
                        {data.latestCycleData.status === 'OK' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            OK
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            NG
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <Clock className="w-8 h-8 text-gray-300" />
                        <span>Waiting for cycle data...</span>
                        {!isConnected && (
                          <span className="text-xs text-red-500">Check WebSocket connection</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span></span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 live-indicator' : 'bg-red-500'}`}></div>
              <span>{isConnected ? 'Real-time' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Filter, Search, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import useWebSocket from '../hooks/useWebSocket';

const AllData = ({ onNavigateBack }) => {
  const { data, requestAllData, isConnected } = useWebSocket('ws://localhost:8080');
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [isLoading, setIsLoading] = useState(true);

  // Request all data saat component mount
  useEffect(() => {
    if (isConnected) {
      const success = requestAllData();
      if (success) {
        setIsLoading(false);
      }
    }
  }, [isConnected, requestAllData]);

  // Update filtered data ketika data berubah
  useEffect(() => {
    if (data.allCycleData) {
      let filtered = [...data.allCycleData];
      
      // Filter berdasarkan search term
      if (searchTerm) {
        filtered = filtered.filter(item => 
          item.no.toString().includes(searchTerm) ||
          item.startTime.includes(searchTerm) ||
          item.endTime.includes(searchTerm) ||
          item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Filter berdasarkan status
      if (statusFilter !== 'all') {
        filtered = filtered.filter(item => item.status.toLowerCase() === statusFilter);
      }
      
      setFilteredData(filtered);
      setCurrentPage(1); // Reset ke halaman pertama saat filter berubah
      setIsLoading(false);
    }
  }, [data.allCycleData, searchTerm, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handleExportCSV = () => {
    const headers = ['No', 'Start Time', 'End Time', 'Cycle Time (s)', 'Status', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.no,
        item.startTime,
        item.endTime,
        item.cycleTime,
        item.status,
        new Date(item.createdAt).toLocaleString('id-ID')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cycle_data_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatTime());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusStats = () => {
    const totalOK = filteredData.filter(item => item.status === 'OK').length;
    const totalNG = filteredData.filter(item => item.status === 'NG').length;
    return { totalOK, totalNG, total: totalOK + totalNG };
  };

  const stats = getStatusStats();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onNavigateBack}
            className="w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Cycle Data</h1>
            <p className="text-sm text-gray-600">Complete production monitoring history</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 live-indicator' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">{isConnected ? 'Live' : 'Disconnected'}</span>
            </div>
            <p className="font-mono text-sm text-gray-900">{currentTime}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Records</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">OK Count</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalOK}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">NG Count</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalNG}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Success Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.total > 0 ? ((stats.totalOK / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by No, Time, or Status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="ok">OK Only</option>
                <option value="ng">NG Only</option>
              </select>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Results Summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} records
          {searchTerm && ` (filtered from ${data.allCycleData?.length || 0} total)`}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">No</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Start Time</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">End Time</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Cycle Time (s)</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Created At</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span>Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <BarChart3 className="w-12 h-12 text-gray-300" />
                      <span>No data found</span>
                      {searchTerm && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                currentData.map((item, index) => (
                  <tr 
                    key={item.id || index} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">{item.no}</td>
                    <td className="py-4 px-6 text-sm text-gray-700 font-mono">{item.startTime}</td>
                    <td className="py-4 px-6 text-sm text-gray-700 font-mono">{item.endTime}</td>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">{item.cycleTime}</td>
                    <td className="py-4 px-6">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'OK' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status === 'OK' ? (
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
                    <td className="py-4 px-6 text-sm text-gray-700 font-mono">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllData;
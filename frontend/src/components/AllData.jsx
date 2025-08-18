import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Filter, Search, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import useWebSocket from '../hooks/useWebSocket'; 

const AllData = ({ onNavigateBack }) => {
  const { data, requestAllData, isConnected } = useWebSocket('ws://localhost:8080');
  
  // State untuk data dan UI
  const [sourceData, setSourceData] = useState([]); // Data asli dari server untuk periode terpilih
  const [filteredData, setFilteredData] = useState([]); // Data yang akan ditampilkan setelah filter client-side
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk filter
  const [dateFilter, setDateFilter] = useState('today'); // Default filter periode adalah 'today'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  
  // State untuk jam real-time
  const [currentTime, setCurrentTime] = useState('');

  // 1. Meminta data dari server ketika komponen terhubung atau filter tanggal berubah
  useEffect(() => {
    if (isConnected) {
      setIsLoading(true);
      // Mengirim request ke server dengan payload berisi periode yang dipilih
      requestAllData({ period: dateFilter }); 
    }
  }, [isConnected, requestAllData, dateFilter]); // Dependency: jalankan saat koneksi berubah atau dateFilter berubah

  // 2. Menerima data dari server dan menyimpannya di sourceData
  useEffect(() => {
    // data.allCycleData adalah data yang sudah difilter berdasarkan periode oleh server
    if (data.allCycleData) {
      setSourceData(data.allCycleData);
      setIsLoading(false);
    }
  }, [data.allCycleData]); // Dependency: jalankan saat data dari websocket berubah

  // 3. Menerapkan filter client-side (search & status) pada sourceData
  useEffect(() => {
    let filtered = [...sourceData];
    
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.no.toString().includes(lowerCaseSearchTerm) ||
        item.startTime.includes(lowerCaseSearchTerm) ||
        item.endTime.includes(lowerCaseSearchTerm) ||
        item.status.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status.toLowerCase() === statusFilter);
    }
    
    setFilteredData(filtered);
    setCurrentPage(1); // Selalu kembali ke halaman pertama setiap kali filter berubah
  }, [sourceData, searchTerm, statusFilter]); // Dependency: jalankan saat sourceData atau filter client-side berubah

  // Logika untuk jam
  const formatTime = () => new Date().toLocaleString('id-ID', { 
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  useEffect(() => {
    setCurrentTime(formatTime());
    const interval = setInterval(() => setCurrentTime(formatTime()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Logika Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Fungsi untuk Ekspor CSV
  const handleExportCSV = () => {
    const headers = ['No', 'Start Time', 'End Time', 'Cycle Time (s)', 'Status', 'Created At'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(item => [
        item.no, `"${item.startTime}"`, `"${item.endTime}"`, item.cycleTime, item.status,
        `"${new Date(item.createdAt).toLocaleString('id-ID')}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cycle_data_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    total: filteredData.length,
    totalOK: filteredData.filter(item => item.status === 'OK').length,
    totalNG: filteredData.filter(item => item.status === 'NG').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={onNavigateBack} className="w-10 h-10 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Cycle Data</h1>
            <p className="text-sm text-gray-600">Complete production monitoring history</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-2 justify-end">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 live-indicator' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">{isConnected ? 'Live' : 'Disconnected'}</span>
          </div>
          <p className="font-mono text-sm text-gray-900">{currentTime.replace(/\./g, ':')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Total Records */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Records</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <BarChart3 className="w-8 h-8 text-blue-400" />
        </div>
        {/* OK Count */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">OK Count</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalOK}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        {/* NG Count */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">NG Count</p>
            <p className="text-2xl font-bold text-red-600">{stats.totalNG}</p>
          </div>
          <XCircle className="w-8 h-8 text-red-400" />
        </div>
        {/* Success Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-purple-600">
              {stats.total > 0 ? ((stats.totalOK / stats.total) * 100).toFixed(1) : '0.0'}%
            </p>
          </div>
          <Clock className="w-8 h-8 text-purple-400" />
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Date Filter */}
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="today">Today</option>
                <option value="last7days">Last 7 Days</option>
                <option value="thismonth">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search data..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 w-full md:w-auto border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="all">All Status</option>
                <option value="ok">OK Only</option>
                <option value="ng">NG Only</option>
              </select>
            </div>
          </div>
          <button onClick={handleExportCSV} className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredData.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} records.
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
                      <span>Loading data for '{dateFilter}'...</span>
                    </div>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center space-y-2">
                      <BarChart3 className="w-12 h-12 text-gray-300" />
                      <span>No data found for the selected filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                currentData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">{item.no}</td>
                    <td className="py-4 px-6 text-sm text-gray-700 font-mono">{item.startTime}</td>
                    <td className="py-4 px-6 text-sm text-gray-700 font-mono">{item.endTime}</td>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">{item.cycleTime}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.status === 'OK' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {item.status}
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">Page {currentPage} of {totalPages}</div>
            <div className="flex items-center space-x-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
              <span className="text-sm text-gray-500">...</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllData;
import { useState, useEffect, useRef } from 'react';

// 1. Definisikan state awal dalam sebuah konstanta agar bisa digunakan kembali
const initialDataState = {
  totalOK: 0,
  totalNG: 0,
  totalParts: 0,
  currentOutput: 0,
  avgCycleTime: 0,
  ngTrendData: [],
  latestCycleData: null,
  allCycleData: []
};

const useWebSocket = (url) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  // 2. Gunakan konstanta initialDataState untuk inisialisasi
  const [data, setData] = useState(initialDataState); 
  
  const reconnectTimeoutRef = useRef();
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectInterval = 3000;

  const connect = () => {
    try {
      console.log('🔗 Attempting to connect to WebSocket:', url);
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnectionStatus('Connected');
        setSocket(ws);
        reconnectAttemptsRef.current = 0;
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message.type);
          
          switch (message.type) {
            case 'INITIAL_DATA':
              setData(prevData => ({
                ...prevData,
                ...message.data,
                totalParts: (message.data.totalOK || 0) + (message.data.totalNG || 0)
              }));
              break;
              
            case 'REAL_TIME_UPDATE':
              setData(prevData => ({
                ...prevData,
                ...message.data,
                totalParts: (message.data.totalOK !== undefined ? message.data.totalOK : prevData.totalOK) + 
                            (message.data.totalNG !== undefined ? message.data.totalNG : prevData.totalNG),
                ngTrendData: message.data.ngTrendData || prevData.ngTrendData
              }));
              break;
              
            case 'ALL_CYCLE_DATA':
              setData(prevData => ({
                ...prevData,
                allCycleData: message.data
              }));
              break;
              
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('Disconnected');
        setSocket(null);
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const timeout = reconnectInterval * Math.pow(1.5, reconnectAttemptsRef.current);
          console.log(`🔄 Reconnecting in ${timeout}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            setConnectionStatus('Reconnecting...');
            connect();
          }, timeout);
        } else {
          console.log('❌ Max reconnection attempts reached');
          setConnectionStatus('Failed');
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('Error');
      };
      
    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      setConnectionStatus('Error');
    }
  };

  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
    };
  }, [url]);

  const sendMessage = (message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    }
    console.warn('⚠️ WebSocket not connected, cannot send message');
    return false;
  };

  const requestAllData = () => {
    return sendMessage({ type: 'REQUEST_ALL_DATA' });
  };
  
  // 3. Buat fungsi untuk mereset data ke state awal
  const resetData = () => {
    console.log('🔄 Resetting data state...');
    setData(initialDataState);
  };

  return {
    socket,
    connectionStatus,
    data,
    sendMessage,
    requestAllData,
    resetData, // 4. Tambahkan fungsi resetData ke objek yang di-return
    isConnected: connectionStatus === 'Connected'
  };
};

export default useWebSocket;
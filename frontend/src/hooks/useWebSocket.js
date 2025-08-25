import { useState, useEffect, useRef, useCallback } from 'react';

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
    const [data, setData] = useState(initialDataState);

    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 10;
    const reconnectInterval = 3000;

    const connect = useCallback(() => {
        try {
            console.log('🔗 Attempting to connect to WebSocket:', url);
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log('✅ WebSocket connected');
                setConnectionStatus('Connected');
                setSocket(ws);
                reconnectAttemptsRef.current = 0;
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                }
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
                            console.warn('Unknown message type:', message.type);
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
                    console.log(`🔄 Reconnecting in ${timeout.toFixed(0)}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

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
            };

        } catch (error) {
            console.error('❌ Error creating WebSocket connection:', error);
            setConnectionStatus('Error');
        }
    }, [url]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (socket) {
                socket.onclose = null;
                socket.close();
            }
        };
    }, [url, connect]);

    const sendMessage = (message) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
            return true;
        }
        console.warn('⚠️ WebSocket not connected, cannot send message');
        return false;
    };

    const requestAllData = useCallback((payload = {}) => {
        return sendMessage({
            type: 'REQUEST_ALL_DATA',
            payload: payload
        });
    }, [socket]);

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
        resetData,
        isConnected: connectionStatus === 'Connected'
    };
};

export default useWebSocket;
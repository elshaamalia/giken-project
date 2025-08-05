const mqtt = require('mqtt');
const WebSocket = require('ws');
const mysql = require('mysql2/promise');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Konfigurasi MySQL
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Buat connection pool MySQL
const pool = mysql.createPool(dbConfig);

// Setup Express untuk REST API
const app = express();
app.use(cors());
app.use(express.json());

// Setup WebSocket Server
const wss = new WebSocket.Server({ port: process.env.WS_PORT });

// Array untuk menyimpan semua WebSocket connections
let clients = [];

// Konfigurasi MQTT
const mqttClient = mqtt.connect(process.env.MQTT_BROKER);

// Variabel untuk tracking data
let totalOK = 0;
let totalNG = 0;
let currentOutput = 0;
let avgCycleTime = 0;
let ngTrendData = []; // Array untuk data NG trend
let allCycleData = []; // Array untuk semua data cycle
let latestCycleData = null;

// Fungsi untuk broadcast data ke semua WebSocket clients 
function broadcastToClients(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    console.log(`📡 Broadcast to ${clients.length} clients:`, data.type);
}

// =================================================================
// == FUNGSI STATISTIK HARIAN (OK, NG, Avg Time, dll) ==
// =================================================================
async function calculateStats() {
    try {
        // Query ini hanya mengambil data dari hari ini (CURDATE())
        const [rows] = await pool.execute(`
            SELECT 
                COUNT(CASE WHEN status = 'OK' THEN 1 END) as ok_count,
                COUNT(CASE WHEN status = 'NG' THEN 1 END) as ng_count,
                AVG(cycle_time_seconds) as avg_cycle_time
            FROM cycle_data
            WHERE DATE(timestamp) = CURDATE() 
        `);
        
        if (rows.length > 0) {
            totalOK = rows[0].ok_count || 0;
            totalNG = rows[0].ng_count || 0;
            avgCycleTime = parseFloat(rows[0].avg_cycle_time || 0).toFixed(2);
            
            // Ambil output terakhir khusus untuk hari ini untuk akurasi lebih tinggi
            const [lastOutputToday] = await pool.execute(
                'SELECT count_number FROM cycle_data WHERE DATE(timestamp) = CURDATE() ORDER BY timestamp DESC, id DESC LIMIT 1'
            );
            currentOutput = lastOutputToday.length > 0 ? lastOutputToday[0].count_number : 0;

        } else {
            // Reset jika belum ada data sama sekali untuk hari ini
            totalOK = 0;
            totalNG = 0;
            avgCycleTime = 0;
            currentOutput = 0;
        }
    } catch (error) {
        console.error('❌ Error calculating daily stats:', error);
    }
}

// =================================================================
// == FUNGSI UNTUK NG TREND REAL-TIME ==
// =================================================================
async function generateNGTrendData() {
    try {
        // Ambil semua data NG hari ini, diurutkan berdasarkan waktu kejadian
        const [ngEvents] = await pool.execute(`
            SELECT 
                end_time 
            FROM cycle_data 
            WHERE 
                DATE(timestamp) = CURDATE() AND status = 'NG'
            ORDER BY 
                STR_TO_DATE(end_time, '%H:%i:%s') ASC
        `);
        
        let cumulativeNG = 0;
        
        // Buat array baru dengan timestamp asli dan nilai kumulatif
        const realTimeTrend = ngEvents.map(event => {
            cumulativeNG++; // Tambah hitungan NG setiap kali ada event
            return {
                time: event.end_time, // Gunakan timestamp asli dari database
                value: cumulativeNG   // Nilai kumulatif saat itu
            };
        });

        ngTrendData = realTimeTrend; // Update variabel global
        
        console.log('📊 Realtime NG Trend data generated:', ngTrendData.length, 'points');
    } catch (error) {
        console.error('❌ Error generating realtime NG trend data:', error);
    }
}

// =================================================================
// == FUNGSI UNTUK MENGAMBIL SEMUA DATA CYCLE (UNTUK TABEL DETAIL) ==
// =================================================================
async function getAllCycleData() {
    try {
        const [rows] = await pool.execute(`
            SELECT 
                id,
                start_time,
                end_time,
                cycle_time_seconds,
                count_number,
                status,
                timestamp
            FROM cycle_data 
            ORDER BY timestamp DESC
            LIMIT 1000
        `);
        
        allCycleData = rows.map(row => ({
            id: row.id,
            no: row.count_number,
            startTime: row.start_time,
            endTime: row.end_time,
            cycleTime: parseFloat(row.cycle_time_seconds).toFixed(2),
            status: row.status,
            createdAt: row.timestamp
        }));
        
        console.log('📋 All cycle data loaded:', allCycleData.length, 'records');
    } catch (error) {
        console.error('❌ Error loading all cycle data:', error);
    }
}

// =================================================================
// == KONEKSI DAN EVENT HANDLING ==
// =================================================================

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('🔗 New WebSocket client connected');
    clients.push(ws);
    
    // Kirim data awal saat client pertama kali terhubung
    ws.send(JSON.stringify({
        type: 'INITIAL_DATA',
        data: {
            totalOK,
            totalNG,
            currentOutput,
            avgCycleTime,
            ngTrendData,
            latestCycleData
        }
    }));
    
    ws.on('close', () => {
        console.log('❌ WebSocket client disconnected');
        clients = clients.filter(client => client !== ws);
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'REQUEST_ALL_DATA') {
                ws.send(JSON.stringify({
                    type: 'ALL_CYCLE_DATA',
                    data: allCycleData
                }));
            }
        } catch (error) {
            console.error('❌ Error handling client message:', error);
        }
    });
});

// MQTT Event: Connection
mqttClient.on('connect', async () => {
    console.log('✅ Connected to MQTT Broker');
    
    mqttClient.subscribe(process.env.MQTT_TOPIC, (err) => {
        if (err) {
            console.error('❌ Error subscribing to topic:', err);
        } else {
            console.log(`📥 Subscribed to topic: ${process.env.MQTT_TOPIC}`);
        }
    });

    // Hitung semua statistik awal saat server pertama kali dijalankan
    await calculateStats();
    await generateNGTrendData();
    await getAllCycleData();

    console.log('🚀 Server is ready and waiting for data...');
});

// MQTT Event: Message received
mqttClient.on('message', async (topic, message) => {
    try {
        console.log('\n📨 New data from ESP32');
        let messageString = message.toString();

        // --- (Bagian parsing string dari ESP32 tetap sama) ---
        if (messageString.startsWith("'") && messageString.endsWith("'")) {
            messageString = messageString.slice(1, -1);
        }
        if (messageString.startsWith('"') && messageString.endsWith('"')) {
            messageString = messageString.slice(1, -1);
        }
        if (messageString.includes('startTime:') && !messageString.includes('"startTime"')) {
            messageString = messageString
                .replace(/startTime:/g, '"startTime":')
                .replace(/endTime:/g, '"endTime":')
                .replace(/cycleTime:/g, '"cycleTime":')
                .replace(/count:/g, '"count":')
                .replace(/status:/g, '"status":')
                .replace(/timestamp:/g, '"timestamp":')
                .replace(/"startTime":([^,}]+)/g, '"startTime":"$1"')
                .replace(/"endTime":([^,}]+)/g, '"endTime":"$1"')
                .replace(/"status":([^,}]+)/g, '"status":"$1"')
                .replace(/"timestamp":([^,}]+)/g, '"timestamp":"$1"');
        }
        // --- (Akhir bagian parsing) ---

        const data = JSON.parse(messageString);

        if (!data.startTime || !data.endTime || data.cycleTime === undefined || data.count === undefined || !data.status) {
            console.log('❌ Invalid data format from ESP32');
            return;
        }

        const query = `
            INSERT INTO cycle_data (start_time, end_time, cycle_time_seconds, count_number, status, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const values = [data.startTime, data.endTime, data.cycleTime, data.count, data.status, data.timestamp];
        const [result] = await pool.execute(query, values);

        // Setelah data baru masuk, hitung ulang semua statistik harian
        await calculateStats();

        // Jika data baru adalah NG, generate ulang data grafiknya
        if (data.status === 'NG') {
            await generateNGTrendData(); 
        }

        latestCycleData = {
            no: data.count,
            startTime: data.startTime,
            endTime: data.endTime,
            cycleTime: parseFloat(data.cycleTime).toFixed(2),
            status: data.status
        };

        // Tambahkan data baru ke daftar semua cycle data di memori
        allCycleData.unshift({
            id: result.insertId,
            no: data.count,
            startTime: data.startTime,
            endTime: data.endTime,
            cycleTime: parseFloat(data.cycleTime).toFixed(2),
            status: data.status,
            createdAt: data.timestamp
        });

        if (allCycleData.length > 1000) {
            allCycleData = allCycleData.slice(0, 1000);
        }

        // Broadcast update ke semua client
        broadcastToClients({
            type: 'REAL_TIME_UPDATE',
            data: {
                totalOK,
                totalNG,
                totalParts: totalOK + totalNG,
                currentOutput,
                avgCycleTime,
                latestCycleData,
                ...(data.status === 'NG' && { ngTrendData }) // Kirim ngTrendData hanya jika ada update NG
            }
        });

        console.log('✅ Data processed and broadcasted');
        console.log(`📊 Daily Stats - OK: ${totalOK}, NG: ${totalNG}, Current: ${currentOutput}, Avg Time: ${avgCycleTime}s`);
    } catch (error) {
        console.error('❌ Error processing MQTT message:', error);
    }
});

// =================================================================
// == ENDPOINTS DAN SHUTDOWN ==
// =================================================================

// REST API Endpoints (untuk debugging)
app.get('/api/stats', (req, res) => res.json({ totalOK, totalNG, totalParts: totalOK + totalNG, currentOutput, avgCycleTime }));
app.get('/api/ng-trend', (req, res) => res.json(ngTrendData));
app.get('/api/all-data', (req, res) => res.json(allCycleData));

// Start HTTP server
app.listen(process.env.HTTP_PORT, () => {
    console.log(`🌐 HTTP server running on port ${process.env.HTTP_PORT}`);
});

// MQTT Error handler
mqttClient.on('error', (error) => {
    console.error('❌ MQTT Error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    mqttClient.end();
    pool.end();
    wss.close();
    process.exit(0);
});
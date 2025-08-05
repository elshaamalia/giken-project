import React from 'react';
// Tambahkan CartesianGrid ke dalam import dari recharts
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';

const NGTrendChart = ({ data, className = "" }) => {
  // Mengambil 50 data point terakhir agar grafik tidak terlalu padat
  const displayData = data.slice(-50);

  const CustomXAxisTick = (props) => {
    const { x, y, payload } = props;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text 
          x={0} 
          y={0} 
          dy={16} 
          textAnchor="end" 
          fill="#6B7280" 
          fontSize="12"
          transform="rotate(-45)"
          className="font-medium"
        >
          {payload.value}
        </text>
      </g>
    );
  };

  const CustomYAxisTick = (props) => {
    const { x, y, payload } = props;
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={4} textAnchor="end" fill="#6B7280" fontSize="12" className="font-medium">
          {payload.value}
        </text>
      </g>
    );
  };

  const maxValue = displayData.length > 0 ? Math.max(...displayData.map(d => d.value)) : 0;
  // Domain sumbu Y disesuaikan agar ada ruang di atas nilai maksimum
  const yAxisDomainMax = Math.max(maxValue + Math.ceil(maxValue * 0.2), 10); 

  return (
    <div className={`w-full h-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={displayData}
          margin={{
            top: 10,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <defs>
            <linearGradient id="ngGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
            </linearGradient>
          </defs>

          {/* --- TAMBAHKAN KODE INI --- */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e5e7eb" 
          />
          {/* --- SAMPAI DI SINI --- */}
          
          <XAxis 
            dataKey="time" 
            axisLine={false}
            tickLine={false}
            tick={<CustomXAxisTick />}
            interval="preserveStartEnd"
            height={60}
          />
          
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={<CustomYAxisTick />}
            domain={[0, yAxisDomainMax]}
            width={40}
            allowDecimals={false}
          />

          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.75rem',
            }}
            labelStyle={{ fontWeight: 'bold', color: '#111827' }}
            itemStyle={{ color: '#ef4444', fontWeight: 'bold' }}
            formatter={(value) => [value, 'NG Count']}
          />
          
          <Area
            type="monotone"
            dataKey="value"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#ngGradient)"
            dot={false}
            activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#ffffff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default NGTrendChart;
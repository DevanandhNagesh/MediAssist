import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const ConfidenceChart = ({ data = [] }) => (
  <div style={{ width: '100%', height: 320 }}>
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="disease" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 1]} tickFormatter={(value) => `${Math.round(value * 100)}%`} />
        <Tooltip formatter={(value) => `${Math.round(value * 100)}%`} />
        <Bar dataKey="confidence" fill="#3f8cff" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default ConfidenceChart;

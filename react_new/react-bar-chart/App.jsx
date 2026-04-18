import BarChart from './BarChart';

const data = [
  { month: 'Jan', revenue: 4200, expenses: 2800 },
  { month: 'Feb', revenue: 5800, expenses: 3200 },
  { month: 'Mar', revenue: 4900, expenses: 3600 },
  { month: 'Apr', revenue: 7200, expenses: 4100 },
  { month: 'May', revenue: 6100, expenses: 3800 },
  { month: 'Jun', revenue: 8400, expenses: 4600 },
];

const colors = {
  revenue:  '#4f46e5',
  expenses: '#e11d48',
};

export default function App() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 1rem', background: '#f0f2f5', minHeight: '100vh' }}>
      <BarChart
        data={data}
        keys={['revenue', 'expenses']}
        colors={colors}
        title="Monthly Revenue vs Expenses"
        subtitle="Jan – Jun 2024 · Hover bars for values"
      />
    </div>
  );
}

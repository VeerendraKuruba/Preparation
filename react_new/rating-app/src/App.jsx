import { useState } from 'react';
import Rating from './Rating';

export default function App() {
  const [value, setValue] = useState(0);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <Rating value={value} onChange={setValue} />
    </div>
  );
}

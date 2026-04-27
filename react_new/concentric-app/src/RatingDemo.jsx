import { useState } from 'react';
import Rating from './Rating';

// SVG data URIs so no external files are needed
const EMPTY =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='32' height='32'%3E%3Cpath fill='none' stroke='%23f5a623' stroke-width='2' d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/%3E%3C/svg%3E";

const HALF =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='32' height='32'%3E%3Cdefs%3E%3ClinearGradient id='h'%3E%3Cstop offset='50%25' stop-color='%23f5a623'/%3E%3Cstop offset='50%25' stop-color='transparent'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23h)' stroke='%23f5a623' stroke-width='2' d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/%3E%3C/svg%3E";

const FILLED =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='32' height='32'%3E%3Cpath fill='%23f5a623' stroke='%23f5a623' stroke-width='2' d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/%3E%3C/svg%3E";

export default function RatingDemo() {
  const [val1, setVal1] = useState(3);
  const [val2, setVal2] = useState(2.5);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 32 }}>
      <h2>Rating Component Demo</h2>

      <h3>Full stars (steps=1), value={val1}</h3>
      <Rating
        value={val1}
        steps={1}
        emptyIcon={EMPTY}
        halfFilledIcon={HALF}
        filledIcon={FILLED}
      />
      <br />
      <button onClick={() => setVal1(v => Math.min(5, v + 1))}>+1</button>
      <button onClick={() => setVal1(v => Math.max(0, v - 1))} style={{ marginLeft: 8 }}>-1</button>

      <h3>Half stars (steps=0.5), value={val2}</h3>
      <Rating
        value={val2}
        steps={0.5}
        emptyIcon={EMPTY}
        halfFilledIcon={HALF}
        filledIcon={FILLED}
      />
      <br />
      <button onClick={() => setVal2(v => Math.min(5, +(v + 0.5).toFixed(1)))}>+0.5</button>
      <button onClick={() => setVal2(v => Math.max(0, +(v - 0.5).toFixed(1)))} style={{ marginLeft: 8 }}>-0.5</button>
    </div>
  );
}

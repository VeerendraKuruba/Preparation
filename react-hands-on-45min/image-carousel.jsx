import { useState } from 'react';

export function ImageCarousel({ slides }) {
  const [i, setI] = useState(0);
  const len = slides.length;
  if (len === 0) return null;

  const next = () => setI((x) => (x + 1) % len);
  const prev = () => setI((x) => (x - 1 + len) % len);

  return (
    <section aria-roledescription="carousel" aria-label="Image carousel">
      <div
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        Slide {i + 1} of {len}
      </div>
      <div style={{ position: 'relative', maxWidth: 480 }}>
        <img
          src={slides[i].src}
          alt={slides[i].alt}
          style={{ width: '100%', display: 'block', borderRadius: 8 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === i ? 'true' : undefined}
              onClick={() => setI(idx)}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: 'none',
                background: idx === i ? '#333' : '#ccc',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Previous slide"
          onClick={prev}
          style={{ position: 'absolute', left: 8, top: '40%', padding: '4px 10px' }}
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={next}
          style={{ position: 'absolute', right: 8, top: '40%', padding: '4px 10px' }}
        >
          ›
        </button>
      </div>
    </section>
  );
}

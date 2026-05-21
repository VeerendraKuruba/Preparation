/**
 * Simple throttle implementation using timer-based approach
 * @param {Function} func - The function to throttle
 * @param {number} wait - The delay in milliseconds
 * @returns {Function} - The throttled function
 */
function throttle(func, wait) {
  let timer = null;
  
  return function(...args) {
    // Only execute if timer is not active
    if (timer === null) {
      func.apply(this, args); // Fixed: was func.call(...args, this)
      
      // Set timer to prevent execution until wait time passes
      timer = setTimeout(() => {
        timer = null;
      }, wait);
    }
  };
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = throttle;
  module.exports.default = throttle;
}

// For ES modules
if (typeof exports !== 'undefined') {
  exports.default = throttle;
}

// ============================================
// EXAMPLES
// ============================================

// Example 1: Basic usage
console.log('=== Example 1: Basic Throttle ===');
const throttledLog = throttle((message) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}, 1000);

console.log('Calling 5 times rapidly:');
for (let i = 1; i <= 5; i++) {
  throttledLog(`Call #${i}`);
}
console.log('Only the first call executed!\n');

// Example 2: Button click handler
setTimeout(() => {
  console.log('=== Example 2: Button Click Handler ===');
  
  let clickCount = 0;
  const handleClick = throttle(() => {
    clickCount++;
    console.log(`Button clicked! Count: ${clickCount}`);
  }, 1000);
  
  // Simulate rapid clicks
  for (let i = 0; i < 10; i++) {
    handleClick();
  }
  console.log('Prevented duplicate actions!\n');
}, 100);

// Example 3: API calls
setTimeout(() => {
  console.log('=== Example 3: Throttled API Calls ===');
  
  const fetchData = throttle((query) => {
    console.log(`🌐 API call made for: "${query}"`);
  }, 500);
  
  // Simulate user typing
  const searches = ['j', 'ja', 'jav', 'java', 'javas', 'javascr', 'javascript'];
  searches.forEach((query, index) => {
    setTimeout(() => {
      console.log(`  User typed: "${query}"`);
      fetchData(query);
    }, index * 50);
  });
}, 500);

// Example 4: Scroll handler
setTimeout(() => {
  console.log('\n=== Example 4: Scroll Handler ===');
  
  let totalScrolls = 0;
  let throttledScrolls = 0;
  
  const handleScroll = throttle(() => {
    throttledScrolls++;
    console.log(`📜 Scroll handler executed: ${throttledScrolls}`);
  }, 200);
  
  // Simulate 20 scroll events
  for (let i = 0; i < 20; i++) {
    totalScrolls++;
    handleScroll();
  }
  
  console.log(`Total scroll events: ${totalScrolls}`);
  console.log(`Throttled executions: ${throttledScrolls}`);
  console.log(`Efficiency: ${Math.round((1 - throttledScrolls/totalScrolls) * 100)}% fewer calls\n`);
}, 1500);

// Example 5: Window resize
setTimeout(() => {
  console.log('=== Example 5: Window Resize Handler ===');
  
  const handleResize = throttle((width, height) => {
    console.log(`🖼️  Window resized to: ${width}x${height}`);
  }, 300);
  
  // Simulate resize events
  for (let i = 0; i < 8; i++) {
    handleResize(1200 + i * 10, 800 + i * 5);
  }
  console.log('Only first resize processed immediately!\n');
}, 2000);

// Example 6: With context (this binding)
setTimeout(() => {
  console.log('=== Example 6: Preserving Context (this) ===');
  
  const counter = {
    count: 0,
    increment: throttle(function() {
      this.count++;
      console.log(`Counter value: ${this.count}`);
    }, 500)
  };
  
  // Call multiple times
  for (let i = 0; i < 5; i++) {
    counter.increment();
  }
  console.log('Context (this) preserved correctly!\n');
}, 2500);

// Comparison with debounce
setTimeout(() => {
  console.log('=== THROTTLE vs DEBOUNCE ===\n');
  
  console.log('THROTTLE (this implementation):');
  console.log('  ✅ Executes immediately on first call');
  console.log('  ✅ Ignores subsequent calls for X milliseconds');
  console.log('  ✅ Guarantees execution at regular intervals');
  console.log('  ✅ Use for: scroll, resize, mousemove, button spam\n');
  
  console.log('DEBOUNCE (different pattern):');
  console.log('  ⏳ Waits for X milliseconds of silence');
  console.log('  ⏳ Resets timer on each call');
  console.log('  ⏳ Executes only after calls stop');
  console.log('  ⏳ Use for: search input, form validation, autocomplete\n');
  
  console.log('KEY DIFFERENCE:');
  console.log('  Throttle → Execute at START, then wait');
  console.log('  Debounce → Wait for END, then execute\n');
}, 3500);

// Alternative implementations
setTimeout(() => {
  console.log('=== Alternative Throttle Implementations ===\n');
  
  // Timestamp-based (more precise)
  console.log('1. Timestamp-based throttle:');
  console.log(`
function throttle(func, wait) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}
  `);
  
  // Timer-based (simpler, current implementation)
  console.log('2. Timer-based throttle (current):');
  console.log(`
function throttle(func, wait) {
  let timer = null;
  return function(...args) {
    if (timer === null) {
      func.apply(this, args);
      timer = setTimeout(() => {
        timer = null;
      }, wait);
    }
  };
}
  `);
}, 4500);


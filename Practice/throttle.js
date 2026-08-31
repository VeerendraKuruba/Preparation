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

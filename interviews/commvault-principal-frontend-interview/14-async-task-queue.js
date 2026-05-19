/*
 * Async Task Queue (HackerRank)
 *
 * Only `AsyncTaskQueue` needs to be filled in — `createPromiseFunction`
 * and `main` are already provided by the platform.
 *
 *   - constructor(concurrency): max number of tasks running at once
 *   - addTask(task): if running < concurrency, start it now;
 *                    otherwise enqueue it
 *   - onComplete(cb): fire cb(resolvedCount, rejectedCount) when ALL
 *                    added tasks have settled
 */

class AsyncTaskQueue {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running = 0;
    this.waiting = [];
    this.resolved = 0;
    this.rejected = 0;
    this.callback = null;
    this.done = false;
  }

  addTask(task) {
    if (this.running < this.concurrency) this._run(task);
    else this.waiting.push(task);
  }

  onComplete(callback) {
    this.callback = callback;
    // In case everything settled before onComplete was registered.
    if (this.running === 0 && this.waiting.length === 0 && !this.done) {
      this.done = true;
      callback(this.resolved, this.rejected);
    }
  }

  async _run(task) {
    this.running++;
    try {
      await task();
      this.resolved++;
    } catch {
      this.rejected++;
    } finally {
      this.running--;
      if (this.waiting.length > 0) {
        this._run(this.waiting.shift());
      } else if (this.running === 0 && this.callback && !this.done) {
        this.done = true;
        this.callback(this.resolved, this.rejected);
      }
    }
  }
}

module.exports = AsyncTaskQueue;

/** At-most-N concurrent async tasks, FIFO queue. */

export class ConcurrencyPool {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.active = 0;
    this.queue = [];
  }

  pump() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const run = this.queue.shift();
      this.active += 1;
      run();
    }
  }

  run(task) {
    return new Promise((resolve, reject) => {
      this.queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            this.active -= 1;
            this.pump();
          });
      });
      this.pump();
    });
  }
}

export async function scheduleWithConcurrency(tasks, concurrency) {
  const pool = new ConcurrencyPool(concurrency);
  return Promise.allSettled(tasks.map((t) => pool.run(t)));
}

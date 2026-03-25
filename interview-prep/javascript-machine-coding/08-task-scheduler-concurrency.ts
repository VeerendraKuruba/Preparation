type Task<T> = () => Promise<T>;

/** Run tasks with at most `concurrency` in flight; preserves submit order for results optional. */

export class ConcurrencyPool {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly concurrency: number) {}

  private pump() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const run = this.queue.shift()!;
      this.active += 1;
      run();
    }
  }

  run<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
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

/** Priority-less FIFO task scheduler with concurrency cap (interview naming). */

export async function scheduleWithConcurrency<T>(
  tasks: Task<T>[],
  concurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const pool = new ConcurrencyPool(concurrency);
  return Promise.allSettled(tasks.map((t) => pool.run(t)));
}

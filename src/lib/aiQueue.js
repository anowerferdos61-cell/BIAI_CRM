// Controlled Concurrency Queue for Batch AI Processing
// Processes ALL leads (never caps at 5) with concurrency=3, automatic retry, and progress callbacks.

export async function processQueueWithConcurrency({
  items = [],
  concurrency = 3,
  processor,
  onProgress
}) {
  const total = items.length;
  if (total === 0) return [];

  const results = new Array(total);
  let nextIndex = 0;
  let completed = 0;

  async function runWorker() {
    while (nextIndex < total) {
      const currentIdx = nextIndex++;
      const item = items[currentIdx];

      let output;
      try {
        output = await processor(item, currentIdx);
      } catch {
        // 1 automatic retry with short backoff
        await new Promise((r) => setTimeout(r, 350));
        try {
          output = await processor(item, currentIdx);
        } catch (secondErr) {
          output = { error: secondErr.message || String(secondErr), item };
        }
      }

      results[currentIdx] = output;
      completed += 1;
      if (onProgress) {
        onProgress({
          completed,
          total,
          currentIndex: currentIdx,
          latestResult: output
        });
      }
    }
  }

  const workerCount = Math.min(concurrency, total);
  const workers = Array.from({ length: workerCount }, () => runWorker());
  await Promise.all(workers);

  return results;
}

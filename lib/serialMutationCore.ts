export type SerialTaskQueue = {
  enqueue: (task: () => Promise<void>) => Promise<void>;
  drain: () => Promise<void>;
};

export function createSerialTaskQueue(): SerialTaskQueue {
  let tail = Promise.resolve();
  return {
    enqueue(task) {
      const result = tail.then(task, task);
      // Keep the internal tail usable after a handled task failure while still
      // returning the real result to the caller.
      tail = result.catch(() => undefined);
      return result;
    },
    drain() {
      return tail;
    },
  };
}
export function isLatestMutation(mutation: number, currentMutation: number) {
  return mutation === currentMutation;
}

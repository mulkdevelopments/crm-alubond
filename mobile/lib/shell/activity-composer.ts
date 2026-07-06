type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeActivityComposer(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestOpenActivityComposer() {
  listeners.forEach((listener) => listener());
}

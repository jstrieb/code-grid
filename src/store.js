import { readable } from "svelte/store";

// Like a Svelte derived store, but rederivable without changing the object
// reference.
//
// Based very loosely on svelte/store/index.js:derived
// https://github.com/sveltejs/svelte/blob/f3a7ded734982ac417b63661bc33a3df859d94f9/packages/svelte/src/store/shared/index.js#L129-L181
//
// Warning: this code is confusing and subtle. That's partly because the code
// it's based on is confusing and subtle. Sorry in advance.
export function rederivable(init_value) {
  let set, update;
  let unsubscribers;
  let started = false;
  let valuePromise = Promise.resolve(undefined);
  let cleanup;

  const result = readable(init_value, (_set, _update) => {
    set = _set;
    update = _update;
  });

  result.rederive = (stores, f) => {
    // Unsubscribe from previous dependencies. According to the docs, subscribe
    // method return values can either be an unsubscribe function, or an object
    // with an unsubscribe method (something about interoperability with "RxJS
    // Observables"?).
    unsubscribers?.forEach((u) => (u?.unsubscribe ?? u)?.());
    cleanup?.();

    // Pending array synchronizes updates so this store's value is only set
    // when all dependents have returned values.
    //
    // Original derived store code uses a bitfield to track pending updates. We
    // use arrays for readability, even though they use more memory per store.
    // They also support more than 64 dependent stores.
    let pending = new Array(stores.length).fill(false);
    let values = new Array(stores.length).fill(undefined);

    // Set the store's value if all dependencies have returned their values.
    function callIfSettled() {
      if (!started) return;
      if (pending.some((x) => x)) return;
      cleanup?.();
      // Calling valuePromise.then with f ensures a total ordering of the
      // updates.
      valuePromise = valuePromise
        .then(async () => await f(values, set, update))
        .then((r) => {
          cleanup = r;
        })
        .catch(() => {
          valuePromise = Promise.resolve(undefined);
        });
    }

    unsubscribers = stores.map((s, i) =>
      s.subscribe(
        (v) => {
          values[i] = v;
          pending[i] = false;
          callIfSettled();
        },
        // Called right before the actual `subscribe` callback above. Seemingly
        // used to check for interleaved updates from dependencies. See:
        // https://stackoverflow.com/a/76917265
        // and
        // https://github.com/sveltejs/svelte/commit/a2ff93cb721b786f34e467b9bddfbf6eebcfde43
        () => {
          pending[i] = true;
        },
      ),
    );

    started = true;
    callIfSettled();
  };

  return result;
}

/** Exact, build-local compilation reuse. A hit never shares mutable program
 * metadata or sampled output with another caller. No hash or normalized source
 * key is used: reviewed evidence and even optional-property presence participate. */

export function capturePlainData<T>(value: T, ancestors = new Set<object>(), captured = new Map<object, unknown>()): T {
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object') throw new Error('Compilation input contract values must be finite plain data.');
  if (ancestors.has(value)) throw new Error('Compilation input contract values cannot contain cycles.');
  if (captured.has(value)) return captured.get(value) as T;
  const array = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) throw new Error('Compilation input contract values must use ordinary object and array prototypes.');
  const keys = Reflect.ownKeys(value), lengthDescriptor = array ? Object.getOwnPropertyDescriptor(value, 'length') : undefined;
  if (array && (!lengthDescriptor || !('value' in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0)) throw new Error('Compilation input contract arrays require an ordinary length.');
  const length = array ? lengthDescriptor!.value as number : 0;
  if (array && keys.length !== length + 1) throw new Error('Compilation input contract arrays cannot contain holes or extra keys.');
  const copy = array ? [] : {};
  captured.set(value, copy); ancestors.add(value);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== 'string' || !descriptor || !('value' in descriptor) || (!descriptor.enumerable && !(array && key === 'length'))) throw new Error('Compilation input contract values cannot contain accessors, symbols or hidden fields.');
    if (array && key !== 'length' && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length)) throw new Error('Compilation input contract arrays cannot contain extra keys.');
    if (!(array && key === 'length')) Object.defineProperty(copy, key, {enumerable: true, writable: true, configurable: true, value: capturePlainData(descriptor.value, ancestors, captured)});
  }
  ancestors.delete(value);
  return copy as T;
}

function exactKey(value: unknown, seen = new Map<object, number>()): string {
  if (value === undefined) return 'u';
  if (value === null) return 'n';
  if (typeof value === 'string') return `s${JSON.stringify(value)}`;
  if (typeof value === 'boolean') return value ? 't' : 'f';
  if (typeof value === 'number') return Object.is(value, -0) ? 'd-0' : `d${value}`;
  const object = value as object, previous = seen.get(object);
  if (previous !== undefined) return `r${previous};`;
  seen.set(object, seen.size);
  // Preserve property order and shared-reference shape as well as every value.
  return `${Array.isArray(object) ? 'a' : 'o'}{${Object.keys(object).map(key => `${JSON.stringify(key)}:${exactKey((object as Record<string, unknown>)[key], seen)}`).join(',')}}`;
}

/** Own trusted compiler output, including less common nested round helpers.
 * Function outputs remain mutable caller-owned data, as ordinary frames are. */
function copyMetadata(value: unknown, seen: Map<object, unknown>): unknown {
  if (typeof value === 'function') throw new Error('A compiler result cannot expose an unowned callable payload.');
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Map) {
    const copy = new Map(); seen.set(value, copy);
    for (const [key, item] of value) copy.set(copyMetadata(key, seen), copyMetadata(item, seen));
    return Object.freeze(copy);
  }
  if (value instanceof Set) {
    const copy = new Set(); seen.set(value, copy);
    for (const item of value) copy.add(copyMetadata(item, seen));
    return Object.freeze(copy);
  }
  const mapView = value as ReadonlyMap<unknown, unknown>;
  if (!Array.isArray(value) && typeof mapView.get === 'function' && typeof mapView.has === 'function' && typeof mapView.entries === 'function' && typeof mapView.keys === 'function' && typeof mapView.values === 'function' && typeof mapView.forEach === 'function' && typeof mapView[Symbol.iterator] === 'function' && typeof mapView.size === 'number') {
    // Formation bindings expose immutable map views, not native Maps. Rebuild
    // their protocols over an owned table: native iterators and forEach's third
    // argument must never escape from the private cached program.
    const data = new Map<unknown, unknown>();
    const view: ReadonlyMap<unknown, unknown> = Object.freeze({
      get size() {return data.size;}, get: (key: unknown) => data.get(key), has: (key: unknown) => data.has(key),
      entries: () => data.entries(), keys: () => data.keys(), values: () => data.values(),
      [Symbol.iterator]: () => data[Symbol.iterator](),
      forEach: (fn: (value: unknown, key: unknown, map: ReadonlyMap<unknown, unknown>) => void, thisArg?: unknown) => data.forEach((item, key) => fn.call(thisArg, item, key, view)),
    });
    seen.set(value, view);
    for (const [key, item] of mapView) data.set(copyMetadata(key, seen), copyMetadata(item, seen));
    return view;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value)) return structuredClone(value);
  const copy: Record<PropertyKey, unknown> | unknown[] = Array.isArray(value) ? [] : {};
  seen.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    const item = Reflect.get(value, key);
    Object.defineProperty(copy, key, {enumerable: true, configurable: true, writable: true, value: typeof item === 'function'
      ? (...args: unknown[]) => copyResult(Reflect.apply(item, value, args))
      : copyMetadata(item, seen)});
  }
  return Object.freeze(copy);
}

function copyResult<T>(value: T): T {
  // Frames and ordinary topology records take the native, fast data-only path.
  // Readonly relation-map views contain functions and need the protocol-aware
  // owner above instead. Their original immutable public contract is retained.
  try {return preserveFrozenResults(value, structuredClone(value));} catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'DataCloneError') throw error;
    return copyMetadata(value, new Map()) as T;
  }
}

/** Native cloning correctly owns the data, but deliberately drops frozen state.
 * Keep the original API's immutable diagnostic/warning leaves without freezing
 * ordinary mutable frames or changing any underlying program-owned object. */
function preserveFrozenResults<T>(source: T, copy: T, seen = new Set<object>()): T {
  if (!source || typeof source !== 'object' || seen.has(source)) return copy;
  seen.add(source);
  if (source instanceof Map && copy instanceof Map) {
    const entries = copy.entries();
    for (const [key, value] of source) {
      const [copiedKey, copiedValue] = entries.next().value!;
      preserveFrozenResults(key, copiedKey, seen); preserveFrozenResults(value, copiedValue, seen);
    }
  } else if (source instanceof Set && copy instanceof Set) {
    const values = copy.values();
    for (const value of source) preserveFrozenResults(value, values.next().value, seen);
  } else {
    for (const key of Object.keys(source)) preserveFrozenResults(Reflect.get(source, key), Reflect.get(copy as object, key), seen);
  }
  if (Object.isFrozen(source)) Object.freeze(copy);
  return copy;
}

function ownedFacade<T extends object>(program: T): T {
  const facade = {} as T;
  let seen = new Map<object, unknown>([[program, facade]]);
  for (const key of Reflect.ownKeys(program)) {
    const value = Reflect.get(program, key);
    if (typeof value === 'function') {
      Object.defineProperty(facade, key, {enumerable: true, value: (...args: unknown[]) => copyResult(Reflect.apply(value, program, args))});
    } else {
      // Large diagnostic round tables are uncommon in playback. Own them on
      // first access rather than eagerly copying them on every validation hit.
      let read = false, owned: unknown;
      Object.defineProperty(facade, key, {enumerable: true, get() {
        if (!read) {
          const pending = new Map(seen);
          owned = copyMetadata(value, pending); seen = pending; read = true;
        }
        return owned;
      }});
    }
  }
  return Object.freeze(facade);
}

export function createOwnedProgramCache<I, O extends object>(compile: (input: I) => O, options: {maxEntries?: number; maxKeyBytes?: number} = {}): (input: I) => O {
  const maxEntries = options.maxEntries ?? 6, maxKeyBytes = options.maxKeyBytes ?? 2 * 1024 * 1024;
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 100 || !Number.isSafeInteger(maxKeyBytes) || maxKeyBytes < 1 || maxKeyBytes > 16 * 1024 * 1024) throw new Error('Program cache bounds must be positive bounded integers.');
  const entries = new Map<string, O>(); let keyBytes = 0;
  return (input: I): O => {
    // Capture descriptors directly and never read the original again. Browser
    // JavaScript cannot reliably identify every proxy. A proxy may present plain
    // data, but later traps cannot replace already captured fields or cause a
    // newly installed getter to run during cloning/keying/compilation.
    const owned = capturePlainData(input);
    const key = exactKey(owned), bytes = key.length * 2;
    const hit = entries.get(key);
    if (hit) { entries.delete(key); entries.set(key, hit); return ownedFacade(hit); }
    const program = compile(owned);
    if (bytes <= maxKeyBytes) {
      entries.set(key, program); keyBytes += bytes;
      while (entries.size > maxEntries || keyBytes > maxKeyBytes) {
        const oldest = entries.keys().next().value!;
        entries.delete(oldest); keyBytes -= oldest.length * 2;
      }
    }
    return ownedFacade(program);
  };
}

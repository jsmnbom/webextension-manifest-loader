import deepcopy from 'deepcopy';

import { VENDORS } from './constants';
import { AnyObject, Manifest } from './interfaces';

function isPlainObject(value: object): boolean {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

// Iterate over plain objects in nested objects and arrays
function* deepIteratePlainObjects(
  item: AnyObject
): Generator<AnyObject, void, void> {
  if (Array.isArray(item)) {
    // Got an array, check its elements
    for (const x of item) {
      yield* deepIteratePlainObjects(x);
    }
  } else if (isPlainObject(item)) {
    // Got a plain object, yield it
    yield item as { [key: string]: unknown; [key: number]: unknown };
    // Check its properties
    for (const x of Object.values(item)) {
      yield* deepIteratePlainObjects(x as AnyObject);
    }
  }
}

export function objectMap<O extends AnyObject, K extends string | number>(
  obj: O,
  fn: (key: K, val: unknown, index: number) => [K, unknown]
): O {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value], index) => fn(key as K, value, index))
  ) as O;
}

function objectMapFilter<K extends string | number>(
  obj: AnyObject,
  fn: (key: K, val: unknown, index: number) => [K, unknown] | null
): AnyObject {
  return Object.fromEntries(
    Object.entries(obj)
      .map(([key, value], index) => fn(key as K, value, index))
      .filter((o) => o !== null) as [K, unknown][]
  ) as AnyObject;
}

export function convertVendorKeys(
  manifest: AnyObject,
  targetVendor: typeof VENDORS[number]
): Manifest {
  // Make sure we don't change the original manifest
  manifest = deepcopy(manifest);
  // Loop over all child objects
  for (const obj of deepIteratePlainObjects(manifest)) {
    // Map over the object allowing for filtering
    const newObj = objectMapFilter(obj, (key, val) => {
      // Match stuff like __VENDOR_KEY__
      // This is similar to the standard manifest i18n
      // __MSG_KEY__ key names
      const pattern = new RegExp(`^__(?:\\+?(${VENDORS.join('|')}))*_(.*)__$`);
      const found = key.toString().match(pattern);
      // If we found a key that needs converting
      if (found) {
        // Chekck it's vendor
        const keyVendors = found[1];
        // If we don't target the vendor, filter it
        if (!keyVendors.includes(targetVendor)) return null;
        // Otherwise remove the __VENDOR_ __ parts
        key = found[2];
      }
      return [key, val];
    });
    // Properly assign newObj to obj
    for (const key of Object.keys(obj)) delete obj[key];
    Object.assign(obj, newObj);
  }
  return manifest as Manifest;
}

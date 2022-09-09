import { DLL, DLLItem } from '@akashbabu/node-dll';
import {
  IState,
  IOptions,
  IOptionArg,
  INodeListItem,
  IFreqListItem,
  IIteratorCb,
} from './interfaces';

interface ILFUCache<T> {
  readonly size: number;
  set(key: string, value: T, force?: boolean): T;
  get(key: string): T | undefined;
  delete(key: string): boolean;
  peek(key: string): T | undefined;
  forEach(cb: IIteratorCb<[string, T], void>): void;
  map<U>(cb: IIteratorCb<[string, T], U>): U[];
  clear(): void;
  dangerously_getState(): IState<T>;
}

export default class LFUCache<T> implements ILFUCache<T> {
  private state: IState<T> = this.getFreshState();
  private options: IOptions;
  // private dummy: any[] = [];

  constructor(options: IOptionArg = {}) {
    if (options.max && !options.evictCount) {
      // choose between 10% of max count and 1 as evictCount
      options.evictCount = Math.max(1, options.max * 0.1);
    }

    this.options = {
      max: options.max || 100,
      evictCount: options.evictCount || 10,
      maxAge: options.maxAge,
    };
  }

  /**
   * Returns the current size of the cache
   */
  public get size(): number {
    return this.state.size;
  }

  /**
   * Caches the given key-value pair
   *
   * **Example**
   * ```TS
   * const lfu = new LFUCache<string>();
   *
   * lfu.set('key', 'value');
   * lfu.set('key', 'value1', true);
   * ```
   *
   * @param key Key
   * @param value Value to be caches against the provided key
   * @param force Replaces the existing value if any, else will add the value to cache
   */
  public set(key: string, value: T, force?: boolean): T {
    const existingValue = this.state.byKey.get(key);

    // for duplicate entry / updating
    // remove the current entry
    // and create a new entry in the cache
    if (existingValue) {
      if (force) {
        // if set by force, then replace only the existing value
        // with the new one without touching size, frequency or nodeList
        existingValue.data.value = value;
        return value;
      } else {
        return existingValue.data.value;
      }
    }

    this.state.size++;
    const freqListItem = this.addToFreqList(key);

    // Add the new node to nodeList
    const nodeItem = this.state.nodeList.push({
      key,
      value,
      utime: Date.now(),
      parent: freqListItem,
    });

    // create a mapping btw new member
    // and the created nodeItem
    this.state.byKey.set(key, nodeItem);

    if (this.state.size > this.options.max) {
      this.evict(this.options.evictCount);
    }

    return value;
  }

  /**
   * Returns cached value for the provided key
   * if one exists, else returns undefined
   *
   * **Example**
   * ```TS
   * const lfu = new LFUCache<string>();
   *
   * lfu.set('key', 'value');
   * lfu.get('key') // => 'value'
   * ```
   *
   * @param key Key whose value is needed
   *
   * @returns Value for the given key if one exists, else
   *  return undefined
   *
   */
  public get(key: string): T | undefined {
    const nodeListItem = this.state.byKey.get(key);
    if (!nodeListItem) return undefined;

    if (this.options.maxAge) {
      if (nodeListItem.data.utime + this.options.maxAge < Date.now()) {
        this.delete(key);
        return;
      }
    }

    // Get the current parent frequency item
    const freqListItem = nodeListItem.data.parent;

    // get next freq item
    let nextFreqListItem = freqListItem.next;

    const nextFreqValue = freqListItem.data.value + 1;

    // if the next freq item value is not as expected,
    // then create a new one with the expected freq value
    if (!nextFreqListItem || nextFreqListItem.data.value !== nextFreqValue) {
      // create a new freq item list and append it
      // after the curr freq item and add the
      // requested key to freq items list
      nextFreqListItem = this.state.freqList.appendAfter(freqListItem, {
        value: freqListItem.data.value + 1,
        items: new Set([key]),
      });
    } else {
      // add requested key to the next freq list item
      nextFreqListItem.data.items.add(key);
    }

    this.removeKeyFromFreqItem(freqListItem, key);

    // Set the new parent
    nodeListItem.data.parent = nextFreqListItem;

    // Update utime/accessed time of the node
    nodeListItem.data.utime = Date.now();

    return nodeListItem.data.value;
  }

  /**
   * Removes the given key from cache
   *
   * **Example**
   * ```TS
   * const lfu = new LFUCache<string>();
   *
   * lfu.set('key', 'value')
   * lfu.get('key') // => value
   *
   * lfu.delete('key')
   * lfu.get('key') // => undefined
   * ```
   *
   * @param key Key to be removed from cache
   */
  public delete(key: string): boolean {
    // get the current node item
    const nodeListItem = this.state.byKey.get(key);

    if (nodeListItem) {
      // Remove the key from frequency node item list
      const freqListItem = nodeListItem.data.parent;
      this.removeKeyFromFreqItem(freqListItem, key);

      // remove the corresponding node from nodelist
      this.state.nodeList.remove(nodeListItem);

      // remove the key from byKey Map
      this.state.byKey.delete(key);

      // Since a node is removed,
      // decrease the size of the cache
      this.state.size--;

      return true;
    }

    return false;
  }

  /**
   * Returns the value for the provided key
   * without increasing the accessed frequency
   * of the requested key
   *
   * **Example**
   * ```TS
   * const lfu = new LFUCache<string>();
   *
   * lfu.set('key', 'value');
   * lfu.peek('key') // => value
   *
   * // but the access frequency of 'key' remain untouched
   * ```
   *
   * @param key Key whose value has to be peeked
   *
   * @returns Value for the provided key
   */
  public peek(key: string): T | undefined {
    return this.state.byKey.get(key)
      ? (this.state.byKey.get(key) as DLLItem<INodeListItem<T>>).data.value
      : undefined;
  }

  /**
   * Iterates over the entire cache
   * in the form of cb([key, val], i)
   *
   * @param cb Iterator callback
   */
  public forEach(cb: IIteratorCb<[string, T], void>): void {
    this.state.nodeList.forEach((nodeListItem, i) => {
      cb([nodeListItem.key, nodeListItem.value], i);
    });
  }

  /**
   * Iterates over the entire cache
   * in the form of cb([key, val], i)
   * and returns the resultant array
   *
   * @param cb Iterator callback
   */
  public map<U>(cb: IIteratorCb<[string, T], U>): U[] {
    const result: U[] = [];

    this.forEach((data, i) => {
      result.push(cb(data, i));
    });

    return result;
  }

  /**
   * Clears all the data in the cache
   */
  public clear(): void {
    this.state = this.getFreshState();
  }

  /**
   * Returns the internal state of the cache.
   * MUST BE USED ONLY FOR TESTING PURPOSE.
   * This must NOT BE tampered for any reasons,
   * if not, the integrity of the functionality
   * CANNOT BE PROMISED.
   */
  public dangerously_getState(): IState<T> {
    return this.state;
  }

  /*********************
   * PRIVATE METHODS
   ********************/

  private getFreshState(): IState<T> {
    return {
      freqList: new DLL<IFreqListItem>(),
      nodeList: new DLL<INodeListItem<T>>(),
      byKey: new Map<string, DLLItem<INodeListItem<T>>>(),
      size: 0,
    };
  }

  private removeKeyFromFreqItem(
    freqListItem: DLLItem<IFreqListItem>,
    key: string,
  ) {
    // remove the requested key from the current parent
    freqListItem.data.items.delete(key);

    // if the curr freq item does not have any items
    // after removing the requested key, then
    // remove the item from freqListItem DLL
    if (freqListItem.data.items.size === 0) {
      this.state.freqList.remove(freqListItem);
    }
  }

  private evict(count: number) {
    while (count--) {
      const freqListHead = this.state.freqList.head;

      if (freqListHead) {
        // remove the first key from frequency List head item
        const key = freqListHead.data.items.keys().next().value;
        this.delete(key);
      }
    }
  }

  private addToFreqList(key: string): DLLItem<IFreqListItem> {
    const freqListHead = this.state.freqList.head;

    if (!freqListHead || freqListHead.data.value !== 1) {
      this.state.freqList.unshift({
        value: 1,
        items: new Set<string>([key]),
      });
    } else {
      freqListHead.data.items.add(key);
    }

    return this.state.freqList.head as DLLItem<IFreqListItem>;
  }
}

if (require.main === module) {
  const SIZE = 3;
  const lfu = new LFUCache<string>({ max: SIZE });

  new Array(SIZE).fill(0).forEach((_, i) => {
    lfu.set(`foo_${i + 1}`, `bar_${i + 1}`);
  });

  // Increment the access frequency
  lfu.get('foo_1');

  lfu.set('foo_1', 'bar_1_2', true);

  lfu.set('foo_4', 'bar_4');
  lfu.set('foo_5', 'bar_5');
}

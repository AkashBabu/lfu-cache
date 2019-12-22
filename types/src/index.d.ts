import { IState, IOptionArg, IIteratorCb } from './interfaces';
interface ILFUCache<T> {
    readonly size: number;
    set(key: string, value: T): void;
    get(key: string): T | undefined;
    delete(key: string): boolean;
    peek(key: string): T | undefined;
    forEach(cb: IIteratorCb<[string, T], void>): void;
    map<U>(cb: IIteratorCb<[string, T], U>): U[];
    clear(): void;
    dangerously_getState(): IState<T>;
}
export default class LFUCache<T> implements ILFUCache<T> {
    private state;
    private options;
    constructor(options?: IOptionArg);
    /**
     * Returns the current size of the cache
     */
    get size(): number;
    /**
     * Caches the given key-value pair
     *
     * **Example**
     * ```TS
     * const lfu = new LFUCache<string>();
     *
     * lfu.set('key', 'value');
     * ```
     *
     * @param key Key
     * @param value Value to be caches against the provided key
     */
    set(key: string, value: T): void;
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
    get(key: string): T | undefined;
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
    delete(key: string): boolean;
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
    peek(key: string): T | undefined;
    /**
     * Iterates over the entire cache
     * in the form of cb([key, val], i)
     *
     * @param cb Iterator callback
     */
    forEach(cb: IIteratorCb<[string, T], void>): void;
    /**
     * Iterates over the entire cache
     * in the form of cb([key, val], i)
     * and returns the resultant array
     *
     * @param cb Iterator callback
     */
    map<U>(cb: IIteratorCb<[string, T], U>): U[];
    /**
     * Clears all the data in the cache
     */
    clear(): void;
    /**
     * Returns the internal state of the cache.
     * MUST BE USED ONLY FOR TESTING PURPOSE.
     * This must NOT BE tampered for any reasons,
     * if not, the integrity of the functionality
     * CANNOT BE PROMISED.
     */
    dangerously_getState(): IState<T>;
    /*********************
     * PRIVATE METHODS
     ********************/
    private getFreshState;
    private removeKeyFromFreqItem;
    private evict;
    private addToFreqList;
}
export {};

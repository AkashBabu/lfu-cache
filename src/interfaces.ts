import { DLLItem, DLL } from '@akashbabu/node-dll';

export interface IFreqListItem {
  value: number;
  items: Set<string>;
}

export interface INodeListItem<T> {
  key: string;
  value: T;
  utime: number;
  parent: DLLItem<IFreqListItem>;
}

export interface IState < T > {
  freqList: DLL<IFreqListItem>;
  nodeList: DLL<INodeListItem<T>>;
  byKey: Map<string, DLLItem<INodeListItem<T>>>;
  size: number;
}

export interface IOptions {
  max: number;
  evictCount: number;
  maxAge?: number;
}

export interface IOptionArg {
  max?: number;
  evictCount?: number;

  /**
   * Maximum time upto which the keys would be
   * retained in the cache even when unused.
   * Note that this time is in milliseconds(ms)
   */
  maxAge?: number;
}

export type IIteratorCb<T, U> = (data: T, i: number) => U;

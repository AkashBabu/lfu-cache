# lfu-cache [![Coverage Status](https://coveralls.io/repos/github/AkashBabu/lfu-cache/badge.svg?branch=master)](https://coveralls.io/github/AkashBabu/lfu-cache?branch=master) [![Build Status](https://travis-ci.com/AkashBabu/lfu-cache.svg?branch=master)](https://travis-ci.com/AkashBabu/lfu-cache) [![Maintainability](https://api.codeclimate.com/v1/badges/b31fd7f387b54be7a02c/maintainability)](https://codeclimate.com/github/AkashBabu/lfu-cache/maintainability)

LFU cache implementation with a complexity of `O(1)` for all transactions, as described in the paper ["An O(1) algorithm for implementing the LFU cache eviction scheme" by K. Shah, A. Mitra and D. Matani](http://dhruvbird.com/lfu.pdf)

What's the motivation behind creating this library(inspite of other currently existing LFU cache libraries out there) ?
- Most importantly it's the Typescript support
- Implementation of `O(1)` for all transactions (even though I din create the algorithm for it 😜)
- Maintainable code


If you ever wanna peek into the source code, I would suggest you to read the algorithm in above mentioned paper first and then look into code, for better understanding or suggestions.

## Installation

> npm i @akashbabu/lfu-cache -S

## Example

```TS
import LFUCache from '@akashbabu/lfu-cache';

const lfu = new LFUCache<string>();

lfu.set('foo', 'bar');
console.log(lfu.size) // => 1

console.log(lfu.get('foo')) // => bar
console.log(lfu.peek('foo')) // => bar

lfu.delete('foo')
console.log(lfu.get('foo')) // => undefined


lfu.set('item1', 'foo')
lfu.set('item1', 'bar')
console.log(lfu.get('item1')) // => bar

lfu.clear();
console.log(lfu.size) // => 0

lfu.set('item1', 'foo')
lfu.set('item2', 'bar')
lfu.set('item3', 'baz')

lfu.forEach(([key, val], i) => {
  console.log(`${i + 1})`, key, val)
})
// => 1) item1 foo
// => 2) item2 bar
// => 3) item3 baz

console.log(lfu.map<string>(([key, val], i) => `${i + 1}) ${key} -> ${val}`))
// => ["1) item1 foo", "2) item2 bar", "3) item3 baz"]
```


## API Documentation

#### new LFUCache<T>(options? = {})

Instantiates LFU cache

T -> Type of the value being stored

| Param | Description |
|:------|:------------|
| options.max (optional) | Specifies the maximum number item to accumulate in the cache. Defaults to `100` |
| options.evictCount (optional) | Specifies the number of items to be evicted once the cache is full. If `options.max` is specified and `options.evictCount` is not specified, then it defaults to `10%` of `options.max` else it defaults to `1` |
| options.maxAge (optional) | If specified, then lazily evicts the keys after the specified `maxAge`. Please note that this is in `milliseconds (ms)` | 


#### .size

Returns the total number of items in the cache.  
This is a `readonly` property.


#### .set(key: string, value: T): void

Caches the given key-value pair and evicts LFU keys if the cache is full.


#### .get(key: string): T | undefined

Returns the cached value if present or if NOT expired, else returns `undefined`


### .delete(key: string): boolean

Removes the given key from cache. Returns `true` if the given key was present and it has been removed successfully else returns `false`


#### .peek(key: string): T | undefined

Returns the cached value for the given key without increasing the access frequency of the given key. Returns `undefined` if the given keys if NOT present in the cache


#### .forEach(cb: ([key: string, val: T], i: number) => void): void

Iterates through the entire cache


#### .map<U>(cb: ([key: string, val: T], i: number) => U): U[]

Iterates through the entire cache and returns the resultant array

U -> Denotes the return type when `cb` is called


#### .clear(): void

Clears all the data in the cache


## Contribution

We beleive there is nothing we've left out in `v1.0.0`, but there is always scope for development, hence if you find any bug or have any suggestion to make, then please proceed to github and raise an Issue or PR for the same.

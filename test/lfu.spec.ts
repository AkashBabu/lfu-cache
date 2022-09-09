import { expect } from "chai";
import delay from "delay";
import LFUCache from "../src";
import { DLLItem } from "@akashbabu/node-dll";
import { INodeListItem } from "../src/interfaces";

describe("#LFUCache()", () => {
  it("should work w/o errors when constructor is called", () => {
    expect(() => {
      new LFUCache();
    }).to.not.throw;
  });

  it("should at-max store only the specified number of items in the cache", () => {
    const SIZE = 5;
    const lfu = new LFUCache<number>({ max: SIZE });

    new Array(SIZE + 5).fill(0).forEach((_, i) => {
      lfu.set(i.toString(), i);
    });

    const state = lfu.dangerously_getState();
    expect(state.byKey.size).to.be.eql(SIZE);
    expect(state.nodeList.length).to.be.eql(SIZE);
  });

  it("should initialize state with empty contents in the state", () => {
    const lfu = new LFUCache<string>({ max: 10 });

    const state = lfu.dangerously_getState();
    expect(state.byKey.size).to.be.eql(0);
    expect(state.nodeList.length).to.be.eql(0);
    expect(state.freqList.length).to.be.eql(0);
  });

  describe(".set()", () => {
    it("should save the given key-value pair", () => {
      const SIZE = 5;
      const lfu = new LFUCache<number>({ max: SIZE });

      new Array(SIZE - 1).fill(0).forEach((_, i) => {
        lfu.set(i.toString(), i);
      });

      new Array(SIZE - 1).fill(0).forEach((_, i) => {
        expect(lfu.get(i.toString())).to.be.eql(i);
      });

      const state = lfu.dangerously_getState();
      expect(state.byKey.size).to.be.eql(SIZE - 1);
      expect(state.nodeList.length).to.be.eql(SIZE - 1);
      expect(state.freqList.length).to.be.eql(1);
    });

    it("should evict LFU data from the cache if the size of the cache exceeds the specified limit", () => {
      const SIZE = 5;
      const lfu = new LFUCache<number>({ max: SIZE });

      new Array(SIZE).fill(0).forEach((_, i) => {
        lfu.set(i.toString(), i);
      });

      new Array(SIZE - 1).fill(0).forEach((_, i) => {
        expect(lfu.get(i.toString())).to.be.eql(i);
      });

      lfu.set("5", 5);

      expect(lfu.get("4")).to.be.undefined;
    });

    it("should not replace the existing cached value when `force` is false", () => {
      const SIZE = 5;
      const lfu = new LFUCache<string>({ max: SIZE });

      lfu.set("foo", "bar");
      lfu.set("foo", "baz");

      expect(lfu.get("foo")).to.be.eql("bar");
    });

    it("should replace the existing cached value when `force` is true", () => {
      const SIZE = 3;
      const lfu = new LFUCache<string>({ max: SIZE });

      new Array(SIZE).fill(0).forEach((_, i) => {
        lfu.set(`foo_${i + 1}`, `bar_${i + 1}`);
      });

      // Increment the access frequency
      lfu.get("foo_1");

      lfu.set("foo_1", "bar_1_2", true);

      lfu.set("foo_4", "bar_4");
      lfu.set("foo_5", "bar_5");
      lfu.set("foo_6", "bar_6");

      expect(lfu.get("foo_2")).to.be.undefined;
      expect(lfu.get("foo_3")).to.be.undefined;
      expect(lfu.get("foo_1")).to.be.eql("bar_1_2");
    });
  });

  describe(".get()", () => {
    let lfu: LFUCache<string>;

    beforeEach(() => {
      const SIZE = 5;
      lfu = new LFUCache<string>({ max: SIZE, maxAge: 100 });
    });

    it("should return the value for the requested key", () => {
      lfu.set("foo", "bar");

      expect(lfu.get("foo")).to.be.eql("bar");
    });

    it("should return undefined if the given key is not present in the cache", () => {
      expect(lfu.get("empty")).to.be.undefined;
    });

    it("should increment the frequency of the item, on get", () => {
      lfu.set("foo", "bar");

      expect(
        (
          lfu.dangerously_getState().byKey.get("foo") as DLLItem<
            INodeListItem<string>
          >
        ).data.parent.data.value
      ).to.be.eql(1);

      expect(lfu.get("foo")).to.be.eql("bar");

      expect(
        (
          lfu.dangerously_getState().byKey.get("foo") as DLLItem<
            INodeListItem<string>
          >
        ).data.parent.data.value
      ).to.be.eql(2);
    });

    it("should prune the items lazily after the specified maxAge", async () => {
      lfu.set("foo", "bar");

      await delay(120);

      expect(lfu.get("foo")).to.be.undefined;
      expect(lfu.size).to.be.eql(0);
    });

    it("should update the utime of the nodeItem when the item is accessed", async () => {
      lfu.set("foo", "bar");

      await delay(70);

      lfu.get("foo");

      await delay(40);

      expect(lfu.get("foo")).to.be.eql("bar");
      expect(lfu.size).to.be.eql(1);
    });
  });

  describe(".delete()", () => {
    let lfu: LFUCache<string>;

    beforeEach(() => {
      const SIZE = 5;
      lfu = new LFUCache<string>({ max: SIZE });
    });

    it("should delete the given key from the cache", () => {
      lfu.set("foo", "bar");

      expect(lfu.get("foo")).to.be.eql("bar");

      lfu.delete("foo");
      expect(lfu.get("foo")).to.be.undefined;
    });
  });

  describe(".peek()", () => {
    let lfu: LFUCache<string>;
    const SIZE = 5;

    beforeEach(() => {
      lfu = new LFUCache<string>({ max: SIZE });
    });

    it("should return the value for the requested key", () => {
      lfu.set("foo", "bar");

      expect(lfu.peek("foo")).to.be.eql("bar");
    });

    it("should return undefined if the requested key is not present", () => {
      expect(lfu.peek("emtpy")).to.be.undefined;
    });
    it("should not increase the access frequency when peek is called", () => {
      lfu.set("foo", "bar");

      expect(
        (
          lfu.dangerously_getState().byKey.get("foo") as DLLItem<
            INodeListItem<string>
          >
        ).data.parent.data.value
      ).to.be.eql(1);

      expect(lfu.peek("foo")).to.be.eql("bar");

      expect(
        (
          lfu.dangerously_getState().byKey.get("foo") as DLLItem<
            INodeListItem<string>
          >
        ).data.parent.data.value
      ).to.be.eql(1);
    });
  });

  describe(".forEach()", () => {
    let lfu: LFUCache<number>;
    const SIZE = 5;

    beforeEach(() => {
      lfu = new LFUCache<number>({ max: SIZE });
    });

    it("should be iteratable", () => {
      new Array(SIZE).fill(0).forEach((_, i) => {
        lfu.set(i.toString(), i);
      });

      lfu.forEach(([key, value], i) => {
        expect(key).to.be.eql(i.toString());
        expect(value).to.be.eql(i);
      });
    });
  });

  describe(".map()", () => {
    let lfu: LFUCache<number>;
    const SIZE = 5;

    beforeEach(() => {
      lfu = new LFUCache<number>({ max: SIZE });
    });

    it("should be iterable and return a resultant array", () => {
      new Array(SIZE).fill(0).forEach((_, i) => {
        lfu.set(i.toString(), i);
      });

      const result = lfu.map(([key, value], i) => {
        expect(key).to.be.eql(i.toString());
        expect(value).to.be.eql(i);

        return i + 1;
      });

      result.map((i, j) => {
        expect(i).to.be.eql(j + 1);
      });
    });
  });

  describe(".size", () => {
    let lfu: LFUCache<string>;
    const SIZE = 5;

    beforeEach(() => {
      lfu = new LFUCache<string>({ max: SIZE });
    });

    it("should be increased when a new item is added to the cache", () => {
      expect(lfu.size).to.be.eql(0);

      lfu.set("foo", "bar");
      expect(lfu.size).to.be.eql(1);
    });

    it("should decrease the length of the cache of removing the given key", () => {
      expect(lfu.size).to.be.eql(0);

      lfu.set("foo", "bar");
      lfu.set("bar", "baz");
      expect(lfu.size).to.be.eql(2);

      lfu.delete("foo");
      expect(lfu.size).to.be.eql(1);

      lfu.delete("bar");
      expect(lfu.size).to.be.eql(0);
    });

    it("should decrease the length of the cache if the given key does not exist in the cache", () => {
      expect(lfu.size).to.be.eql(0);

      lfu.set("foo", "bar");
      expect(lfu.size).to.be.eql(1);

      lfu.delete("unknown");
      expect(lfu.size).to.be.eql(1);
    });

    // This test case was submitted in #1
    it("should never be more than the max size specified", () => {
      const cache = new LFUCache<number | string>({ max: 100, evictCount: 1 });

      // Generate random number
      const random = (min: number, max: number) =>
        Math.round(Math.random() * (max - min)) + min;

      const cacheFunc = (key: string, value: number | string) => {
        if (typeof cache.peek(key) !== "undefined") return cache.get(key);
        cache.set(key, value);
        return value;
      };

      //  "cold" will be called only once
      cacheFunc("cold", "123");
      // "hot" will be called for 20 times
      for (let i = 1; i <= 20; i++) {
        cacheFunc("hot", "456");
      }

      // Let the cache size limit exceeded
      for (let i = 1; i <= 200; i++) {
        // all of them will be called three times
        cacheFunc(String(100 + i), random(100, 900));
        cacheFunc(String(100 + i), random(100, 900));
        cacheFunc(String(100 + i), random(100, 900));
      }

      // "new" will be called once
      cacheFunc("new", "123");

      // Should be 789 not 123, because the cold cache will be removed from the cache.
      expect(cacheFunc("cold", "789")).to.be.eql("789");

      // Should be 456 not 789, because it is hot and remains in the cache.
      expect(cacheFunc("hot", "789")).to.be.eql("456");

      // Should be 123 not 789, because it is a new item added to the cache.
      expect(cacheFunc("new", "123")).to.be.eql("123");

      expect(cache.size).to.be.eql(100);
    });
  });

  describe("clear()", () => {
    it("should clear nodeList, freqList and size of the cache", () => {
      const lfu = new LFUCache<string>();

      lfu.set("foo", "bar");

      expect(lfu.size).to.be.eql(1);

      lfu.clear();
      expect(lfu.size).to.be.eql(0);
    });

    it("should not cause any memory leakage in the process of clearing", function () {
      this.timeout(50 * 1000);

      const SIZE = 10000;
      const lfu = new LFUCache<string>({ max: SIZE + 1 });

      for (let i = 0; i < 1000; ++i) {
        for (let j = 0; j < SIZE; ++j) {
          lfu.set("foo" + j, "bar");
        }

        expect(lfu.size).to.be.eql(SIZE);
        lfu.clear();
        expect(lfu.size).to.be.eql(0);
      }
    });
  });
});

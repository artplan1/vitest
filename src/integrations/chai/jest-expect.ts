import { ChaiPlugin } from './types'

// Jest Expect Compact
// TODO: add more https://jestjs.io/docs/expect
export function JestChaiExpect(): ChaiPlugin {
  return (chai, utils) => {
    const proto = chai.Assertion.prototype
    utils.addMethod(proto, 'toEqual', function(this: Chai.Assertion, expected: any) {
      return this.eql(expected)
    })
    utils.addMethod(proto, 'toStrictEqual', function(this: Chai.Assertion, expected: any) {
      return this.equal(expected)
    })
    utils.addMethod(proto, 'toBe', function(this: Chai.Assertion, expected: any) {
      return this.be(expected)
    })
    utils.addMethod(proto, 'toContain', function(this: Chai.Assertion, item: any) {
      return this.contain(item)
    })
    utils.addMethod(proto, 'toBeTruthy', function(this: Chai.AssertionStatic) {
      const obj = utils.flag(this, 'object')
      this.assert(
        Boolean(obj),
        'expected #{this} to be truthy',
        'expected #{this} to not be truthy',
        obj,
      )
    })
    utils.addMethod(proto, 'toFalsy', function(this: Chai.AssertionStatic) {
      const obj = utils.flag(this, 'object')
      this.assert(
        !obj,
        'expected #{this} to be falsy',
        'expected #{this} to not be falsy',
        obj,
      )
    })
    utils.addMethod(proto, 'toBeNaN', function(this: Chai.Assertion) {
      return this.be.NaN
    })
    utils.addMethod(proto, 'toBeUndefined', function(this: Chai.Assertion) {
      return this.be.undefined
    })
    utils.addMethod(proto, 'toBeNull', function(this: Chai.Assertion) {
      return this.be.null
    })
    utils.addMethod(proto, 'toBeDefined', function(this: Chai.Assertion) {
      return this.not.be.undefined
    })
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Chai {
    interface Assertion {
      // Jest compact
      toEqual(expected: any): void
      toStrictEqual(expected: any): void
      toBe(expected: any): void
      toContain(item: any): void
      toBeTruthy(): void
      toBeFalsy(): void
      toBeNaN(): void
      toBeUndefined(): void
      toBeNull(): void
      toBeDefined(): void
    }
    interface ExpectStatic {
      addSnapshotSerializer: import('pretty-format').Plugin
    }
  }
}
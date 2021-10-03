import { Builder } from './builder';
import { ScopeType } from './scope-type';

describe('Builder', () => {
  describe('build', () => {
    it('returns a map instance.', () => {
      const builder = new Builder();
      const registry = builder.build();

      expect(registry instanceof Map).toBe(true);
    });

    it('always creates a new map whenever its called.', () => {
      const builder = new Builder();
      const registryA = builder.build();
      const registryB = builder.build();

      expect(registryA).not.toBe(registryB);
    });

    it('when adding a service, an already built map is not modified', () => {
      const builder = new Builder();

      const builderWithService = builder.add('Foo', jest.fn());

      const registryA = builder.build();
      const registryB = builderWithService.build();

      expect(registryA.size).toBe(0);
      expect(registryB.size).toBe(1);
    });
  });

  describe('add', () => {
    it('when only one key is used, it will only set one key and by default scope is set as OnDemand.', () => {
      const factory = jest.fn();
      const onScopeEnd = jest.fn();

      const builder = new Builder().add(
        'Foo',
        factory,
        ScopeType.OnDemand,
        onScopeEnd
      );

      const result = builder.build();
      const registryEntry = {
        scope: ScopeType.OnDemand,
        onScopeEnd,
        factory,
      };

      expect(Array.from(result.keys())).toStrictEqual(['Foo']);
      expect(Array.from(result.values())).toStrictEqual([registryEntry]);
      expect(result.get('Foo')).toStrictEqual(registryEntry);
    });

    it('when multiple keys are used, it will set all keys with the same value.', () => {
      const factory = jest.fn();
      const onScopeEnd = jest.fn();

      const builder = new Builder().add(
        ['Foo', 'Bar', 'FooBar'],
        factory,
        ScopeType.OnDemand,
        onScopeEnd
      );

      const result = builder.build();
      const registryEntry = {
        scope: ScopeType.OnDemand,
        onScopeEnd,
        factory,
      };

      expect(Array.from(result.keys())).toStrictEqual(['Foo', 'Bar', 'FooBar']);
      expect(Array.from(result.values())).toStrictEqual([
        registryEntry,
        registryEntry,
        registryEntry,
      ]);
      expect(result.get('Foo')).toStrictEqual(registryEntry);
      expect(result.get('Bar')).toStrictEqual(registryEntry);
      expect(result.get('FooBar')).toStrictEqual(registryEntry);
    });

    it('when different keys are used for different services it will store both.', () => {
      const factoryA = jest.fn();
      const factoryB = jest.fn();
      const onScopeEnd = jest.fn();

      const builder = new Builder()
        .add('Foo', factoryA, ScopeType.OnDemand, onScopeEnd)
        .add('Bar', factoryB, ScopeType.OnDemand, onScopeEnd);

      const result = builder.build();
      const factoryAValue = {
        scope: ScopeType.OnDemand,
        onScopeEnd,
        factory: factoryA,
      };
      const factoryBValue = {
        scope: ScopeType.OnDemand,
        onScopeEnd,
        factory: factoryB,
      };

      expect(Array.from(result.keys())).toStrictEqual(['Foo', 'Bar']);
      expect(Array.from(result.values())).toStrictEqual([
        factoryAValue,
        factoryBValue,
      ]);
      expect(result.get('Foo')).toStrictEqual(factoryAValue);
      expect(result.get('Bar')).toStrictEqual(factoryBValue);
    });

    it('when same keys are used for different services it will store only the last.', () => {
      const factoryA = jest.fn();
      const factoryB = jest.fn();
      const onScopeEnd = jest.fn();

      const builder = new Builder()
        .add('Foo', factoryA, ScopeType.OnDemand, onScopeEnd)
        .add('Foo', factoryB, ScopeType.OnDemand, onScopeEnd);

      const result = builder.build();
      const factoryBValue = {
        scope: ScopeType.OnDemand,
        onScopeEnd,
        factory: factoryB,
      };

      expect(Array.from(result.keys())).toStrictEqual(['Foo']);
      expect(Array.from(result.values())).toStrictEqual([factoryBValue]);
      expect(result.get('Foo')).toStrictEqual(factoryBValue);
    });
  });
});

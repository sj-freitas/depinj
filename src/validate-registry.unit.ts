import { Builder } from "./builder";
import { ScopeType } from "./scope-type";
import { validateRegistry } from "./validate-registry";

describe("validateRegistry", () => {
  it('allows for a valid registry to work', () => {
    class SomeService {
      constructor(a: AnotherService) {}
    }
    class AnotherService {
      constructor(b: CommonService) {}
    }
    class YetAnotherService {
      constructor(c: CommonService, anotherExmple: number) {}
    }
    class CommonService {}

    const registry = new Builder()
      .addType('SomeService', SomeService, ['AnotherService'], ScopeType.OnDemand)
      .addType('AnotherService', AnotherService, ['CommonService'], ScopeType.OnDemand)
      .addType(
        'YetAnotherService',
        YetAnotherService,
        ['CommonService', 'AnotherExample'],
        ScopeType.OnDemand
      )
      .addType('CommonService', SomeService, [], ScopeType.OnDemand)
      .add<any>('AnotherExample', (ctx) => ctx.apples.things)
      .add<any>('AnotherExampleWithService', (_, finder) =>
        finder.getService('AnotherExample')
      )
      .build();

    const result = validateRegistry(registry);

    expect(result).toHaveLength(0);
  });

  it('detects if there are dependencies with missing services', () => {
    class SomeService {
      constructor(a: AnotherService) {}
    }
    class AnotherService {
      constructor(b: CommonService) {}
    }
    class YetAnotherService {
      constructor(c: CommonService) {}
    }
    class CommonService {
      constructor(d: UnregisteredService) {}
    }
    class UnregisteredService {}

    const registry = new Builder()
      .addType('SomeService', SomeService, ['AnotherService'], ScopeType.OnDemand)
      .addType('AnotherService', AnotherService, ['CommonService'], ScopeType.OnDemand)
      .addType('YetAnotherService', YetAnotherService, ['CommonService'], ScopeType.OnDemand)
      .addType('CommonService', SomeService, ['UnregisteredService'], ScopeType.OnDemand)
      .build();

    const result = validateRegistry(registry);

    expect(result.join('|')).toBe(
      'Root Service with key SomeService depends on a service keyed UnregisteredService which does not exist.|Root Service with key AnotherService depends on a service keyed UnregisteredService which does not exist.|Root Service with key YetAnotherService depends on a service keyed UnregisteredService which does not exist.|Root Service with key CommonService depends on a service keyed UnregisteredService which does not exist.'
    );
  });

  it('detects a direct circular dependency', () => {
    class CircularService {
      constructor(a: CircularService) {}
    }

    const registry = new Builder()
      .addType('CircularService', CircularService, [ 'CircularService'], ScopeType.OnDemand)
      .build();

    const result = validateRegistry(registry);

    expect(result.join('|')).toBe(
      'Root Service with key CircularService has a circular dependency with CircularService.'
    );
  });

  it('detects a nested circular dependency', () => {
    class CircularService {
      constructor(a: AnotherService) {}
    }
    class AnotherService {
      constructor(a: CircularService) {}
    }

    const registry = new Builder()
      .addType('CircularService', CircularService, ['AnotherService'], ScopeType.OnDemand)
      .addType('AnotherService', AnotherService, ['CircularService'], ScopeType.OnDemand)
      .build();

    const result = validateRegistry(registry);

    expect(result.join('|')).toBe(
      'Root Service with key CircularService has a circular dependency with AnotherService.|Root Service with key AnotherService has a circular dependency with CircularService.'
    );
  });

  it('detects a scope of a parent instance that is less embracing than the child', () => {
    class SimpleService {
      constructor() {}
    }
    class AnotherService {
      constructor(a: SimpleService) {}
    }

    const registry = new Builder()
      .addType('SimpleService', SimpleService, [], ScopeType.Transient)
      .addType('AnotherService', AnotherService, ['SimpleService'], ScopeType.SingleInstance)
      .build();

    const result = validateRegistry(registry);

    expect(result.join('|')).toBe(
      'Root Service with key AnotherService has a scope of SingleInstance which is less embracing than SimpleService scope of Transient.'
    );
  });
});

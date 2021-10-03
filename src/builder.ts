import type { ServiceGetter } from "./injector";
import { ScopeType } from "./scope-type";

/**
 * Type alias to represent a service factory. It's a function that given a specific context
 * and an injector, it will create the specific instance.
 */
export type FunctionConfig<TContext> = (
  context: TContext,
  serviceGetter: ServiceGetter
) => any;

/**
 * Represents a pair of a scope and a factory.
 */
export interface ServiceConfiguration {
  scope: ScopeType;
  factory: FunctionConfig<any>;
  onScopeEnd: (instance: any, context: any) => void;
}

/**
 * Represents the Dependency Tree, a type alias to a Map of keys and service configurations that
 * is used to build injectors.
 */
export type Registry = Map<string, ServiceConfiguration>;

/**
 * Defines a registry that allows for services to be registered. When build is called it will
 * export the created registry so that it can be converted into an Injector. This type is responsible
 * for configuring how services depend on each other.
 */
export class Builder {
  private readonly registry: Registry;

  constructor(
    registry: Map<string, ServiceConfiguration> = new Map<
      string,
      ServiceConfiguration
    >()
  ) {
    this.registry = registry;
  }

  /**
   * Registers a service from a function, instead of getting the explicit dependencies in order
   * it requires a function that defines how the service is instanced. The configuration may
   * depend on the context or the injector, the injector will get the services from a specific key.
   *
   * @param key - The key in which to register the service, can be a single string or an array. If
   * the key already exists, it replaces the previous value.
   * @param functionConfig - The function that creates the object or function that is registered.
   * @param scope - The type of scope in which to register the dependency.
   * @param onScopeEnd - Optional callback to add behavior when a scope ends. This should be used
   * when a service has scope specific resources that need to be closed once the scope ends its
   * lifetime.
   * 
   * @returns The same instance of Builder for fluent api-usage.
   */
  public add<TContext>(
    key: string[] | string,
    functionConfig: FunctionConfig<TContext>,
    scope: ScopeType = ScopeType.OnDemand,
    onScopeEnd: (instance: any, context: TContext) => void = () => {}
  ): Builder {
    const keys = typeof key === 'object' && key instanceof Array ? key : [key];
    const serviceConfiguration: ServiceConfiguration = {
      scope,
      factory: functionConfig,
      onScopeEnd,
    };

    const registry = new Map(this.registry);
    for (const currKey of keys) {
      registry.set(currKey, serviceConfiguration);
    }

    return new Builder(registry);
  }


  /**
   * Registers a service from a constructor and its dependencies.
   *
   * @param key - The key in which to register the service, can be a single string or an array. If
   * the key already exists, it replaces the previous value.
   * @param dependencies - The list of names of dependencies which this service will depend upon.
   * @param DependentType - The type to be registered.
   * @param scope - The type of scope in which to register the dependency.
   * @param onScopeEnd - Optional callback to add behavior when a scope ends. This should be used
   * when a service has scope specific resources that need to be closed once the scope ends its
   * lifetime.
   *
   * @returns The same instance of Builder for fluent api-usage.
   */
  public addType<T, TContext>(
    key: string[] | string,
    DependentType: new (...args: any[]) => T,
    dependencies: string[] = [],
    scope: ScopeType = ScopeType.OnDemand,
    onScopeEnd: (instance: T, context: TContext) => void = () => {}
  ): Builder {
    // Create the factory
    const factory: FunctionConfig<any> = (
      _: any,
      serviceGetter: ServiceGetter
    ) => {
      const services = dependencies.map((t) => serviceGetter.getService(t));

      return new DependentType(...services);
    };

    return this.add(key, factory, scope, onScopeEnd);
  }

  /**
   * Exposes the configuration as a map that can be used as a Registry to create Injectors.
   * The returned object is a copy of the current registration, therefore build has no side
   * effects.
   *
   * @returns A map that contains the service registrations.
   */
  public build(): Registry {
    return new Map(this.registry);
  }
}

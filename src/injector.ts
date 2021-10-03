import type { Registry } from "./builder";
import { ScopeType } from "./scope-type";

/**
 * Exposes only the function that retrieves a service given a specific key.
 */
export interface ServiceGetter {
  /**
   * Given a specific service key, retrieves a specific service.
   *
   * @param key - The key to retrieve the service from.
   */
  getService: <T>(key: string) => T;
}

/**
 * A symbol is used to avoid any possible chance of collision with this scope.
 */
const dependencyInjectionContextSymbol = Symbol('dependencyInjectionContext');

interface ServiceHandle<T, TContext> {
  instance: T;
  onScopeEnd: (instance: T, context: TContext) => void;
}

interface DependencyData {
  scopedServices: Map<string, ServiceHandle<any, any>>;
  onDemandServices: ServiceHandle<any, any>[];
}

interface DependencyContext {
  [dependencyInjectionContextSymbol]: DependencyData;
}

/**
 * A type that can retrieve instances from keys and create new scopes. A class of this type should only be created on the basis
 * of one per application.
 */
export class Injector<TContext> implements ServiceGetter {
  private readonly isMainScope: boolean;
  private readonly scope: DependencyContext & TContext;
  private readonly registry: Registry;
  private readonly singleInstanceServices: Map<string, ServiceHandle<any, any>>;

  /**
   * Creates an instance of an injector. The injector is a type that can retrieve instances from keys and create new scopes.
   * The responsibility of this class is also to keep track of the children instances so that these can be re-used whenever
   * the scope matches or instances are disposed.
   *
   * @param registry - The registry in which this injector and all its descendants are based in.
   * @param scope - The scope to bind this injector to.
   * @param singleInstanceServices - The single instance services that are already created. This optional parameter should only be
   * set by the "createScope" method.
   * @param isMainScope - Indicates that this is the main scope in order to dispose of the single instance services in case that
   * these have sensitive resources. This optional parameter should only be set by the "createScope" method.
   */
  constructor(
    scope: TContext,
    registry: Registry,
    singleInstanceServices: Map<string, ServiceHandle<TContext, any>> = new Map<
      string,
      ServiceHandle<TContext, any>
    >(),
    isMainScope = true
  ) {
    this.isMainScope = isMainScope;
    this.scope = scope as DependencyContext & TContext;
    this.singleInstanceServices = singleInstanceServices;

    // Re-use the scoped instances in case one is already defined, otherwise, create a new one.
    // Bind the dependency injection to the scope if not already bound
    if (!this.scope[dependencyInjectionContextSymbol]) {
      this.scope[dependencyInjectionContextSymbol] = Injector.createDependencyData<TContext>();
    }

    this.registry = registry;
  }

  /**
   * Given a specific service key, retrieves a specific service.
   * It will save the service according to the scope so that it can be re-used or at least
   * it can be cleared up once the injector scope is over.
   *
   * @param key - The key to retrieve the service from.
   */
  public getService<T>(key: string): T {
    const currRegistration = this.registry.get(key);
    if (!currRegistration) {
      throw new Error(`There's no type registered to the key ${key}.`);
    }

    // Auxiliary function that will create a new service in case it doesn't exist, or in the
    // case of an OnDemand scope, it will always create.
    const createInstance: () => ServiceHandle<T, TContext> = () => ({
      instance: currRegistration.factory(this.scope, this) as T,
      onScopeEnd: currRegistration.onScopeEnd,
    });
    // Gets all the keys associated with this service to retrieve an equivalent service in the
    // case it already exists as a created instance.
    const keys: string[] = Array.from(this.registry.entries())
      .filter(([_, value]) => value === currRegistration)
      .map(([key]) => key);

    // According to the scope type we need to apply a different logic to create or retrieve the
    // instance.
    switch (currRegistration.scope) {
      case ScopeType.SingleInstance: {
        return Injector.getOrCreate<T, TContext>(
          keys,
          createInstance,
          this.singleInstanceServices
        ).instance;
      }
      case ScopeType.Transient: {
        return Injector.getOrCreate<T, TContext>(
          keys,
          createInstance,
          this.scope[dependencyInjectionContextSymbol].scopedServices
        ).instance;
      }
      case ScopeType.OnDemand: {
        const onDemandService = createInstance();

        // On Demand services are tracked so they can be disposed.
        this.scope[dependencyInjectionContextSymbol].onDemandServices.push(
          onDemandService
        );

        return onDemandService.instance;
      }
    }
  }

  /**
   * Creates a new scope based on the current scope. A new scoped Injector will not share scoped instances.
   * However, all instances of type SingleInstance are shared.
   *
   * @param newScope - The scope instance to bind the new scope to.
   * @param onScopeEnd - A callback to when the scope ends so that the scope can dispose of its services.
   * @returns A new scope based on the current one.
   */
  public createScope<VContext>(
    newScope: VContext,
  ): Injector<VContext> {
    // Creates a secondary scope from this instance.
    return new Injector<VContext>(
      newScope,
      this.registry,
      new Map(this.singleInstanceServices),
      false
    );
  }

  /**
   * Callback to run whenever the scope is closed, it will run the "onScopeEnd" code
   * for all the registered services.
   * 
   * It's of utmost importance that this method is called whenever a scope has ended
   * to avoid possible memory leaks.
   * 
   * When endScope is called, the state of the Injector will be reset, therefore all
   * the previously created instances will be removed.
   */
  public endScope() {
    const scopedServices = this.scope[dependencyInjectionContextSymbol];

    // Always clear the services that were created in the current child scope.
    const servicesToDispose: ServiceHandle<TContext, any>[] = [
      ...scopedServices.onDemandServices,
      ...scopedServices.scopedServices.values(),
    ];

    if (this.isMainScope) {
      // Only add the single instances if this is the main scope
      servicesToDispose.push(...this.singleInstanceServices.values());
    }

    for (const { onScopeEnd, instance } of servicesToDispose) {
      onScopeEnd(instance, this.scope);
    }

    this.scope[dependencyInjectionContextSymbol] = Injector.createDependencyData<TContext>();
  }

  /**
   * Auxiliary method, it will get-or-create an instance using the createInstance method. However if the instance is
   * already registered in the services map, it will be retrieved from there instead. The keys that are used will be
   * to search for any equivalent service, since a service can be registered with several keys.
   *
   * @param keys - The keys to retrieve the service from.
   * @param createInstance - A method that will forcefully create an instance.
   * @param services - The services to check the existence of the instance for or to add the new instance to.
   * @returns A retrieved or newly created instance of the service matching one of the keys.
   */
   private static getOrCreate<T, TContext>(
    keys: string[],
    createInstance: () => ServiceHandle<T, TContext>,
    services: Map<string, ServiceHandle<T, TContext>>
  ) {
    let service: ServiceHandle<T, TContext> | undefined;

    for (const currKey of keys) {
      // Check for equivalent services.
      service = services.get(currKey);

      if (service) {
        break;
      }
    }

    if (!service) {
      // No service exists, it will create a new one.
      service = createInstance();

      services.set(keys[0], service);
    }

    return service;
  }

  /**
   * Auxiliary function that creates a new DependencyData. A DependencyData is an object that
   * can decorate a context to save the dependency state. This value should not be exposed.
   * 
   * @returns A DependencyData with an empty state.
   */
  private static createDependencyData<TContext>(): DependencyData {
    const scopedServices = new Map<string, ServiceHandle<any, TContext>>();
    const onDemandServices: ServiceHandle<any, TContext>[] = [];

    return {
      scopedServices,
      onDemandServices,
    };
  }
}

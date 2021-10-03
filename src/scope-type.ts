/**
 * Defines all the supported types of dependency injection scopes.
 */
export enum ScopeType {
  /**
   * Creates a new instance whenever it's needed. Instances will never be shared within
   * services. Can only depend on other OnDemand instances.
   */
  OnDemand = 1,

  /**
   * A single instance is one instance for the whole application regardless of the level
   * in which it's created. A SingleInstance should only depend on a SingleInstance or OnDemand scopes.
   * Instances are always shared.
   */
  SingleInstance = 2,

  /**
   * An instance that only lives within a temporary scope. The scope can be defined, for
   * example, as during a Request. Instances are shared within only the same scope. It can
   * depend on any type of scope.
   */
   Transient = 3,
}

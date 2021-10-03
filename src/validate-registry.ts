import type { Registry, ServiceConfiguration } from "./builder";
import type { ServiceGetter } from "./injector";
import { ScopeType } from "./scope-type";

/**
 * Exports a helper function that navigates within a registry and detects if there are any circular
 * dependencies or missing registrations. This function should only be used in the context of unit
 * tests in order to ensure that the registry is correctly built.
 *
 * @param registry - The registry to validate.
 * @returns - Array of strings containing all errors, empty if no errors were detected.
 */
export function validateRegistry(registry: Registry): string[] {
  return Array.from(registry.entries()).reduce<string[]>(
    (aggregatedErrors: string[], t: [string, ServiceConfiguration]) => {
      const errors = validateEntry(t, registry);

      return [...aggregatedErrors, ...errors];
    },
    []
  );
}

/**
 * Creates an object that whatever type of access it will
 * never result in an exception.
 */
function createDynamicContext(): any {
  return new Proxy(
    {},
    {
      get: () => createDynamicContext(),
    }
  );
}

function validateEntry(
  [key, value]: [string, ServiceConfiguration],
  registry: Registry
): string[] {
  const trackedErrors: string[] = [];
  const visitedServices = new Set<string>();
  const mockContext = createDynamicContext();
  const parentScope = value.scope;

  // Mocks a service getter that will stimulate the resolving of dependencies.
  // This allows for the dependency tree to be validated.
  const mockRegistry: ServiceGetter = {
    getService: (dependencyKey: string) => {
      const serviceRegistry = registry.get(dependencyKey);
      if (!serviceRegistry) {
        trackedErrors.push(
          `Root Service with key ${key} depends on a service keyed ${dependencyKey} which does not exist.`
        );
        return;
      }

      if (visitedServices.has(dependencyKey)) {
        trackedErrors.push(
          `Root Service with key ${key} has a circular dependency with ${dependencyKey}.`
        );
        return;
      }

      // Check if the scope is equal or smaller. If the scope is smaller it means that the service should not depend
      // on it.
      if (parentScope < serviceRegistry.scope) {
        const parentScopeName = ScopeType[parentScope];
        const childScopeName = ScopeType[serviceRegistry.scope];

        trackedErrors.push(
          `Root Service with key ${key} has a scope of ${parentScopeName} which is less embracing than ${dependencyKey} scope of ${childScopeName}.`
        );
        return;
      }

      const allEquivalentServices = Array.from(registry.entries())
        .filter(([_, t]) => t.factory === serviceRegistry.factory)
        .map(([key]) => key);
      for (const currKey of allEquivalentServices) {
        visitedServices.add(currKey);
      }

      serviceRegistry.factory(mockContext, mockRegistry);
    },
  } as ServiceGetter;

  value.factory(mockContext, mockRegistry);

  return trackedErrors;
}

# depinj - A Dependency Injection libary
A simple Dependency Injection library written in TypeScript compatible with vanilla JavaScript recommended for NodeJS.

## Usage

Installation
`npm install --save depinj-js`

Example
```js
import { Builder, Injector, ScopeType } from 'depinj-js';

// Registering instances
const builder = new Builder().add(
    'FooService',
    () => ({ foo: 'bar' }),
    ScopeType.SingleInstance
);

const registry = builder.build();

// Retrieving instances
const injector = new Injector(registry);
const service = injector.getService('FooService');

// logs 'bar'
console.log(service.foo);
```

Example repo:
[depinj-express-example](https://github.com/sj-freitas/depinj-express-example#readme)

## Core Philosophy

Most JS written IoC libraries seem to be heavily opinianted and in my opinion violate the Open/Close principle. This is because the service that we are configuring requires annotations or other external syntax that binds the service concretization with the IoC engine.

This library intends on fixing this using a very simple principle. The configuration logic should be all concentrated in the Builder class.

## Simplicity

This library tries to make the concept of Inversion of Control and Dependency 

## Principles

There are 3 components to the configuration of this library:

1. Configuration
2. Resolving
3. Scopes and Lifetimes

### Configuration
[builder.ts](./src/builder.ts)

Configuration should be only done once in an application's lifetime and should only happen in a centralized place. The purpose of this step is to create a dependency tree. This is a graph where all the services are linked with the services on which they depend.

![Dependency Tree schema with several scopes and tiers of services](https://github.com/sj-freitas/depinj/raw/1.5.5/resources/dependency-tree.jpg)

The library supports a [validation plugin](./src/validate-registry.ts) that attempts at identifying possible configuration issues.

The `builder` instance is immutable, every time an `add` function is called a new instance is created. To get dependency tree (Registry) to add to an injector, call the `build()` method.

### Resolving
[injector.ts](./src/injector.ts)

Once the `build()` method is called, an `Injector` can be created. An `Injector` depends on a Registry (dependency tree) instance and a context (optional), the context is a generic object where the `Injector` will decorate the dependency context, this will be where the instances created from the same scope are stored.

### Scopes and Lifetimes
An `Injector` is bound to a scope. However it can be chained by adding another scope. This will create a child `Injector` instance from another. All instances obtained by this child are only stored in the child's scope.

All instances are configured with one of 3 lifetime scopes. These are the configurations that allow for the `Injector` to decide if it's going to re-use an existing instance or creating a new one. For example, SingleInstances are re-used through the whole application lifetime, while Transient ones are re-used only during a specific scope. [Depinj supports 3 lifetime scope types](./src/scope-type.ts).

![Representation of a lifetime scope during an HTTP request and how the Injector should be used](https://github.com/sj-freitas/depinj/raw/1.5.5/resources/lifetime-scope.jpg)

Since the `Injector` is bound to a context, whenever that context is disposed, its services need to be disposed, therefore the `Injector` exposes a public method, `endScope` which will call all the `onScopeEnd` callback for each service registered with this callback. This is an advanced use.

## Integrations
There's a [depinj-express](https://github.com/sj-freitas/depinj-express#readme) integration package.

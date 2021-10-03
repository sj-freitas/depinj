# depinj (Dependency Injection)
A simple Dependency Injection library written in TypeScript compatible with vanilla JavaScript recommended for NodeJS.

## Usage
Installation:
Configuring:
Creating instances:
Example repo:

## Core Philosophy

Most JS written IoC libraries seem to be heavily opinianted and in my opinion violate the Open/Close principle. This is because the service that we are configuring requires annotations or other external syntax that binds the service concretization with the IoC engine.

This library intends on fixing this using a very simple principle. The configuration logic should be all concentrated in the Builder class.

## Simplicity

This library tries to make the concept of Inversion of Control and Dependency 

### Principles

There are 3 phases to the configuration of this library:

1. Configuration
2. Resolving
3. Scoping

#### Configuration
Configuration should be only done once in an application's lifetime and should only happen in a centralized place. Configuration is where we configure the different 

The library supports a validation plugin that attempts at identifying possible configuration issues.

## TODO
- Express integration
- Example App

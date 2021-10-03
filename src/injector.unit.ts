import { Builder } from './builder';
import { Injector } from './injector';
import { ScopeType } from './scope-type';

interface MathOperator {
  apply: (a: number, b: number) => number;
}

class MultiplicationService implements MathOperator {
  public apply(a: number, b: number): number {
    return a * b;
  }
}

class MathOperation {
  private readonly operator: MathOperator;

  private readonly offset: number;

  constructor(operator: MathOperator, offset: number) {
    this.operator = operator;
    this.offset = offset;
  }

  public doMath(a: number, b: number) {
    return this.operator.apply(a, b) + this.offset;
  }
}

interface AppContext {
  offset: number;
  contextEnd?: (arg: string) => string;
}

describe('Injector', () => {
  describe('getService', () => {
    it('retrieves a dependency by name', () => {
      const builder = new Builder()
        .add<AppContext>('Factor', (ctx) => ctx.offset)
        .addType(['MathOperator', 'MultiplicationService'], MultiplicationService)
        .addType('MathOperation', MathOperation, ['MultiplicationService', 'Factor'], ScopeType.OnDemand);

      const context: AppContext = {
        offset: 3,
      };
      const injector = new Injector(builder.build(), context);
      const operation = injector.getService<MathOperation>('MathOperation');

      expect(operation.doMath(3, 5)).toBe(18);
    });
  });

  describe('onScopeEnd', () => {
    it('calls onScopeEnd when the scope instance ends', () => {
      const mathOperationScopeEnd = jest.fn();
      const builder = new Builder()
        .add<AppContext>('Factor', (ctx) => ctx.offset)
        .addType(['MathOperator', 'MultiplicationService'], MultiplicationService)
        .addType(
          'MathOperation',
          MathOperation,
          ['MultiplicationService', 'Factor'],
          ScopeType.Transient,
          (instance) => {
            mathOperationScopeEnd(instance);
          }
        );

      const context = {
        offset: 3,
        contextEnd: (value: string) => {
          injector.endScope();

          return value;
        }
      };

      // Bind the context end with the context instance.
      const injector = new Injector(builder.build(), context);
      const operation = injector.getService<MathOperation>('MathOperation');

      expect(mathOperationScopeEnd).not.toHaveBeenCalled();

      const scopeEndResult = context.contextEnd('value');

      expect(scopeEndResult).toBe('value');
      expect(mathOperationScopeEnd).toHaveBeenCalledWith(operation);
    });
  });
});

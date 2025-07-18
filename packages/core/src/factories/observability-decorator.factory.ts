import type { ObservabilityService } from "../services/observability.service.js";
import type { TracedService } from "../types/observability.types.js";

/**
 * Options for creating a traced service
 */
export interface TracedServiceOptions {
  serviceName: string;
  defaultSpanAttributes?: Record<string, any>;
  traceAllMethods?: boolean;
  methodsToTrace?: string[];
  methodsToExclude?: string[];
}

/**
 * Creates a decorator that adds observability to a service
 * 
 * This factory creates a proxy that intercepts method calls and
 * automatically creates spans for traced methods.
 */
export const createTracedService = <T extends object>(
  service: T,
  observability: ObservabilityService,
  options: TracedServiceOptions
): T & TracedService => {
  const {
    serviceName,
    defaultSpanAttributes = {},
    traceAllMethods = true,
    methodsToTrace = [],
    methodsToExclude = [],
  } = options;

  // Determine which methods to trace
  const shouldTraceMethod = (methodName: string): boolean => {
    if (methodsToExclude.includes(methodName)) return false;
    if (methodsToTrace.length > 0) return methodsToTrace.includes(methodName);
    return traceAllMethods;
  };

  // Create a proxy that intercepts method calls
  const tracedService = new Proxy(service, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);

      // Handle special TracedService properties
      if (prop === "_isTraced") return true;
      if (prop === "_traceConfig") return observability.getConfig();

      // Only wrap functions
      if (typeof value !== "function") return value;

      const methodName = String(prop);

      // Don't trace if method shouldn't be traced
      if (!shouldTraceMethod(methodName)) return value;

      // Return wrapped function
      return async function (this: any, ...args: any[]) {
        const spanName = `${serviceName}.${methodName}`;
        const spanAttributes = {
          ...defaultSpanAttributes,
          service: serviceName,
          method: methodName,
          // Add parameter info (be careful with sensitive data)
          paramCount: args.length,
        };

        // Use observability service to create span
        return observability.withSpan(
          spanName,
          async () => {
            try {
              const result = await value.apply(this, args);
              
              // Record successful completion
              await observability.recordEvent(`${methodName}.success`, {
                service: serviceName,
              });
              
              return result;
            } catch (error) {
              // Record error
              await observability.recordEvent(`${methodName}.error`, {
                service: serviceName,
                error: error instanceof Error ? error.message : String(error),
              });
              
              throw error;
            }
          },
          spanAttributes
        );
      };
    },
  }) as T & TracedService;

  return tracedService;
};

/**
 * Decorator function for class methods
 * 
 * Usage:
 * ```typescript
 * class MyService {
 *   @traced()
 *   async myMethod() {
 *     // method implementation
 *   }
 * }
 * ```
 */
export function traced(spanName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (this: any, ...args: any[]) {
      // Try to get observability service from instance
      const observability = (this as any)._observability as ObservabilityService;
      
      if (!observability || !observability.isEnabled()) {
        return originalMethod.apply(this, args);
      }

      const name = spanName || `${target.constructor.name}.${propertyKey}`;
      
      return observability.withSpan(
        name,
        () => originalMethod.apply(this, args),
        {
          class: target.constructor.name,
          method: propertyKey,
        }
      );
    };

    return descriptor;
  };
}

/**
 * Helper to create multiple traced services at once
 */
export const createTracedServices = <T extends Record<string, any>>(
  services: T,
  observability: ObservabilityService,
  commonOptions?: Partial<TracedServiceOptions>
): { [K in keyof T]: T[K] & TracedService } => {
  const tracedServices: any = {};

  for (const [name, service] of Object.entries(services)) {
    tracedServices[name] = createTracedService(
      service,
      observability,
      {
        serviceName: name,
        ...commonOptions,
      }
    );
  }

  return tracedServices;
};
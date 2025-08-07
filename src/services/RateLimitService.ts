// Rate limiting configuration and middleware for API endpoints
interface RateLimitConfig {
  windowMs: number;     // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  keyGenerator?: (req: any) => string;
  onLimitReached?: (req: any) => void;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export class RateLimitService {
  private store: RateLimitStore = {};
  private defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: (req) => req.ip || 'anonymous',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  };

  // Endpoint-specific rate limits
  private endpointConfigs: Record<string, RateLimitConfig> = {
    // Authentication endpoints - stricter limits
    '/api/auth/login': {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes
      keyGenerator: (req) => req.ip || 'anonymous'
    },
    '/api/auth/signup': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 signup attempts per hour
      keyGenerator: (req) => req.ip || 'anonymous'
    },
    '/api/auth/reset-password': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 password reset requests per hour
      keyGenerator: (req) => req.email || req.ip || 'anonymous'
    },

    // Data modification endpoints - moderate limits
    '/api/trucks': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20, // 20 requests per minute for truck operations
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },
    '/api/maintenance': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 requests per minute for maintenance operations
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },
    '/api/parts': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 25, // 25 requests per minute for parts operations
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },

    // Read operations - higher limits
    '/api/dashboard': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute for dashboard
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },
    '/api/analytics': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50, // 50 requests per minute for analytics
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },

    // File upload endpoints - very strict limits
    '/api/upload': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5, // 5 uploads per minute
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },

    // Export endpoints - strict limits
    '/api/export': {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 3, // 3 exports per 5 minutes
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    }
  };

  // Clean up expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  // Check if request should be rate limited
  public checkRateLimit(endpoint: string, request: any): { 
    allowed: boolean; 
    remaining: number; 
    resetTime: number;
    retryAfter?: number;
  } {
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to cleanup
      this.cleanupExpiredEntries();
    }

    // Get configuration for this endpoint
    const config = this.getConfigForEndpoint(endpoint);
    const key = this.generateKey(endpoint, request, config);
    const now = Date.now();

    // Initialize or get existing rate limit data
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    const rateLimitData = this.store[key];

    // Check if limit exceeded
    if (rateLimitData.count >= config.maxRequests) {
      const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);
      
      // Call limit reached callback if provided
      if (config.onLimitReached) {
        config.onLimitReached(request);
      }

      return {
        allowed: false,
        remaining: 0,
        resetTime: rateLimitData.resetTime,
        retryAfter
      };
    }

    // Increment counter
    rateLimitData.count++;

    return {
      allowed: true,
      remaining: config.maxRequests - rateLimitData.count,
      resetTime: rateLimitData.resetTime
    };
  }

  // Middleware function for Express.js or similar frameworks
  public createMiddleware(endpoint?: string) {
    return (req: any, res: any, next: any) => {
      const targetEndpoint = endpoint || req.path || req.url;
      const result = this.checkRateLimit(targetEndpoint, req);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': this.getConfigForEndpoint(targetEndpoint).maxRequests,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });

      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter
        });
      }

      next();
    };
  }

  // Get configuration for specific endpoint
  private getConfigForEndpoint(endpoint: string): RateLimitConfig {
    // Check for exact match first
    if (this.endpointConfigs[endpoint]) {
      return { ...this.defaultConfig, ...this.endpointConfigs[endpoint] };
    }

    // Check for pattern matches
    for (const pattern in this.endpointConfigs) {
      if (endpoint.startsWith(pattern)) {
        return { ...this.defaultConfig, ...this.endpointConfigs[pattern] };
      }
    }

    return this.defaultConfig;
  }

  // Generate unique key for rate limiting
  private generateKey(endpoint: string, request: any, config: RateLimitConfig): string {
    const keyBase = config.keyGenerator ? config.keyGenerator(request) : 'anonymous';
    return `${endpoint}:${keyBase}`;
  }

  // Add custom endpoint configuration
  public addEndpointConfig(endpoint: string, config: Partial<RateLimitConfig>): void {
    this.endpointConfigs[endpoint] = { ...this.defaultConfig, ...config };
  }

  // Get current rate limit status for a key
  public getCurrentStatus(endpoint: string, request: any): {
    count: number;
    limit: number;
    remaining: number;
    resetTime: number;
  } {
    const config = this.getConfigForEndpoint(endpoint);
    const key = this.generateKey(endpoint, request, config);
    const rateLimitData = this.store[key];

    if (!rateLimitData || rateLimitData.resetTime < Date.now()) {
      return {
        count: 0,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs
      };
    }

    return {
      count: rateLimitData.count,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - rateLimitData.count),
      resetTime: rateLimitData.resetTime
    };
  }

  // Reset rate limit for specific key (admin function)
  public resetRateLimit(endpoint: string, request: any): void {
    const config = this.getConfigForEndpoint(endpoint);
    const key = this.generateKey(endpoint, request, config);
    delete this.store[key];
  }

  // Get all active rate limits (admin function)
  public getAllActiveLimits(): Array<{
    key: string;
    count: number;
    resetTime: Date;
    endpoint: string;
  }> {
    const now = Date.now();
    return Object.entries(this.store)
      .filter(([_, data]) => data.resetTime > now)
      .map(([key, data]) => ({
        key,
        count: data.count,
        resetTime: new Date(data.resetTime),
        endpoint: key.split(':')[0]
      }));
  }

  // Security enhancement: Detect and handle suspicious patterns
  public detectSuspiciousActivity(endpoint: string, request: any): {
    isSuspicious: boolean;
    reason?: string;
    action?: 'warn' | 'block' | 'throttle';
  } {
    const key = this.generateKey(endpoint, request, this.getConfigForEndpoint(endpoint));
    const rateLimitData = this.store[key];

    if (!rateLimitData) {
      return { isSuspicious: false };
    }

    // Check for rapid-fire requests
    const config = this.getConfigForEndpoint(endpoint);
    const timeElapsed = Date.now() - (rateLimitData.resetTime - config.windowMs);
    const requestRate = rateLimitData.count / (timeElapsed / 1000); // requests per second

    // Suspicious if more than 10 requests per second for most endpoints
    if (requestRate > 10 && !endpoint.includes('/api/dashboard')) {
      return {
        isSuspicious: true,
        reason: 'Unusually high request rate detected',
        action: 'throttle'
      };
    }

    // Check for authentication endpoint abuse
    if (endpoint.includes('/auth/') && rateLimitData.count > 3) {
      return {
        isSuspicious: true,
        reason: 'Potential brute force attack on authentication endpoint',
        action: 'block'
      };
    }

    return { isSuspicious: false };
  }

  // Enhanced logging for security monitoring
  public logRateLimitViolation(endpoint: string, request: any, violation: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      endpoint,
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
      userId: request.userId,
      violation,
      severity: violation.action === 'block' ? 'high' : 
                violation.action === 'throttle' ? 'medium' : 'low'
    };

    // In a real implementation, this would go to a logging service
    console.warn('Rate Limit Violation:', JSON.stringify(logEntry, null, 2));

    // You could also send to external monitoring services here
    // Example: send to DataDog, New Relic, or custom monitoring endpoint
  }
}

// Singleton instance
export const rateLimitService = new RateLimitService();

// Utility function for frontend rate limiting
export class ClientRateLimitService {
  private clientStore: Map<string, { count: number; resetTime: number }> = new Map();

  // Check rate limit on client side before making API calls
  public checkClientRateLimit(endpoint: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const key = endpoint;
    
    let rateLimitData = this.clientStore.get(key);
    
    if (!rateLimitData || rateLimitData.resetTime < now) {
      rateLimitData = {
        count: 0,
        resetTime: now + windowMs
      };
      this.clientStore.set(key, rateLimitData);
    }

    if (rateLimitData.count >= maxRequests) {
      return false; // Rate limited
    }

    rateLimitData.count++;
    return true; // Allowed
  }

  // Get time until next allowed request
  public getRetryAfter(endpoint: string): number {
    const rateLimitData = this.clientStore.get(endpoint);
    if (!rateLimitData) return 0;
    
    return Math.max(0, rateLimitData.resetTime - Date.now());
  }
}

export const clientRateLimitService = new ClientRateLimitService();

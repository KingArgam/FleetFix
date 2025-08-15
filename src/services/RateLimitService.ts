
interface RateLimitConfig {
  windowMs: number;     
  maxRequests: number;  
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
    windowMs: 15 * 60 * 1000, 
    maxRequests: 100,
    keyGenerator: (req) => req.ip || 'anonymous',
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  };

  
  private endpointConfigs: Record<string, RateLimitConfig> = {
    
    '/api/auth/login': {
      windowMs: 15 * 60 * 1000, 
      maxRequests: 5, 
      keyGenerator: (req) => req.ip || 'anonymous'
    },
    '/api/auth/signup': {
      windowMs: 60 * 60 * 1000, 
      maxRequests: 3, 
      keyGenerator: (req) => req.ip || 'anonymous'
    },
    '/api/auth/reset-password': {
      windowMs: 60 * 60 * 1000, 
      maxRequests: 3, 
      keyGenerator: (req) => req.email || req.ip || 'anonymous'
    },

    
    '/api/trucks': {
      windowMs: 60 * 1000, 
      maxRequests: 20, 
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },
    '/api/maintenance': {
      windowMs: 60 * 1000, 
      maxRequests: 30, 
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },
    '/api/parts': {
      windowMs: 60 * 1000, 
      maxRequests: 25, 
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },

    
    '/api/dashboard': {
      windowMs: 60 * 1000, 
      maxRequests: 100, 
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },
    '/api/analytics': {
      windowMs: 60 * 1000, 
      maxRequests: 50, 
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },

    
    '/api/upload': {
      windowMs: 60 * 1000, 
      maxRequests: 5, 
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    },

    
    '/api/export': {
      windowMs: 5 * 60 * 1000, 
      maxRequests: 3, 
      keyGenerator: (req) => req.userId || req.ip || 'anonymous'
    }
  };

  
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  
  public checkRateLimit(endpoint: string, request: any): { 
    allowed: boolean; 
    remaining: number; 
    resetTime: number;
    retryAfter?: number;
  } {
    
    if (Math.random() < 0.01) { 
      this.cleanupExpiredEntries();
    }

    
    const config = this.getConfigForEndpoint(endpoint);
    const key = this.generateKey(endpoint, request, config);
    const now = Date.now();

    
    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    const rateLimitData = this.store[key];

    
    if (rateLimitData.count >= config.maxRequests) {
      const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);
      
      
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

    
    rateLimitData.count++;

    return {
      allowed: true,
      remaining: config.maxRequests - rateLimitData.count,
      resetTime: rateLimitData.resetTime
    };
  }

  
  public createMiddleware(endpoint?: string) {
    return (req: any, res: any, next: any) => {
      const targetEndpoint = endpoint || req.path || req.url;
      const result = this.checkRateLimit(targetEndpoint, req);

      
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

  
  private getConfigForEndpoint(endpoint: string): RateLimitConfig {
    
    if (this.endpointConfigs[endpoint]) {
      return { ...this.defaultConfig, ...this.endpointConfigs[endpoint] };
    }

    
    for (const pattern in this.endpointConfigs) {
      if (endpoint.startsWith(pattern)) {
        return { ...this.defaultConfig, ...this.endpointConfigs[pattern] };
      }
    }

    return this.defaultConfig;
  }

  
  private generateKey(endpoint: string, request: any, config: RateLimitConfig): string {
    const keyBase = config.keyGenerator ? config.keyGenerator(request) : 'anonymous';
    return `${endpoint}:${keyBase}`;
  }

  
  public addEndpointConfig(endpoint: string, config: Partial<RateLimitConfig>): void {
    this.endpointConfigs[endpoint] = { ...this.defaultConfig, ...config };
  }

  
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

  
  public resetRateLimit(endpoint: string, request: any): void {
    const config = this.getConfigForEndpoint(endpoint);
    const key = this.generateKey(endpoint, request, config);
    delete this.store[key];
  }

  
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

    
    const config = this.getConfigForEndpoint(endpoint);
    const timeElapsed = Date.now() - (rateLimitData.resetTime - config.windowMs);
    const requestRate = rateLimitData.count / (timeElapsed / 1000); 

    
    if (requestRate > 10 && !endpoint.includes('/api/dashboard')) {
      return {
        isSuspicious: true,
        reason: 'Unusually high request rate detected',
        action: 'throttle'
      };
    }

    
    if (endpoint.includes('/auth/') && rateLimitData.count > 3) {
      return {
        isSuspicious: true,
        reason: 'Potential brute force attack on authentication endpoint',
        action: 'block'
      };
    }

    return { isSuspicious: false };
  }

  
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

    
    console.warn('Rate Limit Violation:', JSON.stringify(logEntry, null, 2));

    
    
  }
}


export const rateLimitService = new RateLimitService();


export class ClientRateLimitService {
  private clientStore: Map<string, { count: number; resetTime: number }> = new Map();

  
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
      return false; 
    }

    rateLimitData.count++;
    return true; 
  }

  
  public getRetryAfter(endpoint: string): number {
    const rateLimitData = this.clientStore.get(endpoint);
    if (!rateLimitData) return 0;
    
    return Math.max(0, rateLimitData.resetTime - Date.now());
  }
}

export const clientRateLimitService = new ClientRateLimitService();

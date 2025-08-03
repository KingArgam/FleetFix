# FleetFix Backend Integration Guide

## Overview

FleetFix 2.0 now includes comprehensive backend integration capabilities, allowing you to connect to a real API server while maintaining full backward compatibility with mock data for development and testing.

## Architecture

### Service Layer Architecture

```
┌─────────────────────────────────────────┐
│             Components                  │
│    (TrucksPage, MaintenancePage, etc.)  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         DataServiceFactory              │
│     (Automatic Mock/Backend Switching)  │
└─────────────────┬───────────────────────┘
                  │
         ┌────────▼────────┐
         │                 │
┌────────▼────────┐ ┌─────▼──────────┐
│ AsyncDataService│ │ BackendDataService │
│    Adapter      │ │                │
│  (Mock Data)    │ │   (Real API)   │
└─────────────────┘ └────────────────┘
```

### Key Components

1. **DataServiceFactory**: Automatically chooses between mock and backend services based on environment
2. **AsyncDataServiceAdapter**: Wraps the existing mock DataService to provide async compatibility
3. **BackendDataService**: Full API integration with authentication, error handling, and retry logic
4. **ApiService**: Low-level HTTP client with authentication token management
5. **Environment Configuration**: Centralized environment and feature flag management

## Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cp .env.template .env.local
```

Configure your environment variables:
```env
# For mock data (development)
REACT_APP_ENV=mock
REACT_APP_USE_MOCK_DATA=true

# For backend integration
REACT_APP_ENV=development
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:3001/ws
```

### 2. Using the Data Service

```typescript
import { DataServiceFactory } from './services/DataServiceFactory';

// Get the appropriate service (automatically mock or backend)
const dataService = DataServiceFactory.getInstance();

// All operations are now async
const trucks = await dataService.getTrucks();
const result = await dataService.createTruck(truckData);
```

### 3. Environment Switching

```typescript
// Switch to mock mode for testing
DataServiceFactory.useMockService();

// Switch to backend mode for production
DataServiceFactory.useBackendService();

// Check current service type
const serviceType = DataServiceFactory.getCurrentServiceType(); // 'mock' | 'backend'
```

## Backend API Integration

### Authentication

The system supports JWT-based authentication with automatic token refresh:

```typescript
// Login (handled automatically by ApiService)
const response = await apiService.login('username', 'password');

// All subsequent requests include authentication headers
const trucks = await dataService.getTrucks();
```

### Error Handling

Comprehensive error handling with proper TypeScript types:

```typescript
const result = await dataService.createTruck(truckData);

if (!result.success) {
  // Handle validation errors
  result.errors?.forEach(error => {
    console.error(`${error.field}: ${error.message}`);
  });
}
```

### Real-time Updates

WebSocket support for real-time data updates:

```typescript
// Subscribe to truck updates (if backend supports it)
const ws = await dataService.subscribeToUpdates((update) => {
  if (update.type === 'truck_updated') {
    // Handle real-time truck update
    console.log('Truck updated:', update.data);
  }
});

// Clean up when component unmounts
ws?.close();
```

## API Endpoints

The backend integration expects the following REST API endpoints:

### Trucks
- `GET /api/trucks` - List trucks with filtering
- `POST /api/trucks` - Create new truck
- `PUT /api/trucks/:id` - Update truck
- `DELETE /api/trucks/:id` - Delete truck
- `POST /api/trucks/bulk-update-status` - Bulk status update
- `GET /api/trucks/export/csv` - Export trucks to CSV

### Maintenance
- `GET /api/maintenance` - List maintenance entries
- `POST /api/maintenance` - Create maintenance entry
- `PUT /api/maintenance/:id` - Update maintenance entry
- `DELETE /api/maintenance/:id` - Delete maintenance entry
- `POST /api/maintenance/:id/images` - Upload maintenance images
- `GET /api/maintenance/export/csv` - Export maintenance to CSV

### Parts
- `GET /api/parts` - List parts with filtering
- `POST /api/parts` - Create new part
- `PUT /api/parts/:id` - Update part
- `DELETE /api/parts/:id` - Delete part

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

### Audit Logs
- `GET /api/audit-logs` - List audit logs

## Environment Configuration

### Development Environment
```env
REACT_APP_ENV=development
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_DEBUG_MODE=true
REACT_APP_AUTH_ENABLED=true
```

### Staging Environment
```env
REACT_APP_ENV=staging
REACT_APP_API_URL=https://api-staging.fleetfix.com/api
REACT_APP_DEBUG_MODE=false
REACT_APP_AUTH_ENABLED=true
```

### Production Environment
```env
REACT_APP_ENV=production
REACT_APP_API_URL=https://api.fleetfix.com/api
REACT_APP_DEBUG_MODE=false
REACT_APP_AUTH_ENABLED=true
```

### Mock/Demo Environment
```env
REACT_APP_ENV=mock
REACT_APP_USE_MOCK_DATA=true
REACT_APP_FEATURE_REAL_TIME_UPDATES=false
```

## Features

### Automatic Retry Logic
Failed requests are automatically retried with exponential backoff:

```typescript
// Configured in environment
REACT_APP_MAX_RETRIES=3
REACT_APP_API_TIMEOUT=10000
```

### File Upload Support
Support for maintenance image uploads with progress tracking:

```typescript
const result = await dataService.uploadMaintenanceImages(
  maintenanceId, 
  files,
  (progress) => console.log(`Upload progress: ${progress}%`)
);
```

### Bulk Operations
Efficient bulk operations for large datasets:

```typescript
const result = await dataService.bulkUpdateTruckStatus(
  ['truck1', 'truck2', 'truck3'],
  'maintenance'
);
```

### CSV Import/Export
Full CSV import and export capabilities:

```typescript
// Export data
const csvData = await dataService.exportTrucksToCSV();

// Import data (if supported by backend)
const result = await dataService.importTrucksFromCSV(file);
```

## Security Features

### Authentication & Authorization
- JWT token-based authentication
- Automatic token refresh
- Role-based access control

### Data Validation
- Client-side and server-side validation
- TypeScript type safety
- Comprehensive error reporting

### Security Headers
- CORS configuration
- Content Security Policy (CSP)
- Rate limiting support

## Performance Optimizations

### Request Optimization
- Automatic request deduplication
- Response caching
- Pagination support

### Error Recovery
- Automatic retry with exponential backoff
- Graceful degradation to mock data
- Circuit breaker pattern for failed services

## Migration Guide

### From Mock to Backend

1. **Update Environment Variables**
   ```env
   REACT_APP_ENV=development
   REACT_APP_API_URL=http://your-backend-url/api
   ```

2. **No Code Changes Required**
   The DataServiceFactory automatically handles the switch.

3. **Test Backend Connectivity**
   ```typescript
   // Check if backend is available
   try {
     const trucks = await dataService.getTrucks();
     console.log('Backend connected successfully');
   } catch (error) {
     console.log('Using mock data fallback');
   }
   ```

### Gradual Migration
You can migrate endpoint by endpoint by using feature flags:

```env
REACT_APP_FEATURE_BACKEND_TRUCKS=true
REACT_APP_FEATURE_BACKEND_MAINTENANCE=false
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Configure your backend to allow requests from your frontend domain
   - Check CORS_ORIGINS environment variable

2. **Authentication Failures**
   - Verify REACT_APP_AUTH_ENABLED is set correctly
   - Check API credentials and token expiration

3. **Network Timeouts**
   - Increase REACT_APP_API_TIMEOUT value
   - Check network connectivity to backend

4. **Service Fallback**
   - System automatically falls back to mock data if backend is unavailable
   - Check console for fallback messages

### Debug Mode
Enable debug logging to troubleshoot issues:

```env
REACT_APP_DEBUG_MODE=true
```

This will show detailed logs for:
- Service selection (mock vs backend)
- API request/response details
- Authentication token management
- Error handling and retries

## Development Workflow

### Local Development
1. Start with mock data for rapid development
2. Switch to local backend when API is ready
3. Test with staging backend before production

### Testing
```typescript
// Unit tests can force mock mode
DataServiceFactory.useMockService();

// Integration tests can use real backend
DataServiceFactory.useBackendService();
```

### Production Deployment
1. Set production environment variables
2. Verify backend connectivity
3. Monitor error rates and fallback usage

## Contributing

When adding new features:

1. **Add to Interface**: Update IDataService interface
2. **Implement in Both**: Add to both AsyncDataServiceAdapter and BackendDataService
3. **Add Environment Config**: Add any new environment variables
4. **Update Documentation**: Update this README and API documentation

## Support

For backend integration support:
- Check environment configuration
- Verify API endpoint compatibility
- Test with mock data first
- Use debug mode for detailed logging

// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: process.env.NODE_ENV === 'development',
  
  integrations: [
    Sentry.prismaIntegration(),
  ],
  
  // Performance monitoring
  beforeSend(event, hint) {
    // Filter out development errors
    if (process.env.NODE_ENV === 'development') {
      return null
    }
    
    // Filter sensitive information
    if (event.exception) {
      const error = hint.originalException
      if (error instanceof Error) {
        // Don't send authentication errors to Sentry
        if (error.message.includes('authentication') || 
            error.message.includes('unauthorized') ||
            error.message.includes('forbidden')) {
          return null
        }
      }
    }
    
    // Remove sensitive data from event
    if (event.request) {
      // Remove authorization headers
      if (event.request.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
      }
      
      // Remove sensitive query parameters
      if (event.request.query_string) {
        const queryString = typeof event.request.query_string === 'string' 
          ? event.request.query_string 
          : JSON.stringify(event.request.query_string);
        event.request.query_string = queryString
          .replace(/password=[^&]*/gi, 'password=[FILTERED]')
          .replace(/token=[^&]*/gi, 'token=[FILTERED]');
      }
    }
    
    return event
  },
  
  // Set server context
  initialScope: {
    tags: {
      component: 'server'
    }
  }
})
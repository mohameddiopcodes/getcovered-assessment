import { NextResponse } from 'next/server';

// CORS configuration for API routes
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 hours
};

// Helper function to create CORS-enabled responses
export function createCorsResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { 
    status, 
    headers: corsHeaders 
  });
}

// Helper function to handle preflight requests
export function handleCorsPreflight() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

// More restrictive CORS configuration for production
export const productionCorsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
};

// Environment-based CORS headers
export function getCorsHeaders() {
  return process.env.NODE_ENV === 'production' 
    ? productionCorsHeaders 
    : corsHeaders;
}

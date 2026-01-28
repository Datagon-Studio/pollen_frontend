// Type declaration for the built Express app used by serverless functions.
// This makes TypeScript happy for:
//   import('../../backend/dist/app.js')

declare module '../../backend/dist/app.js' {
  export const app: any;
}


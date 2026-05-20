import { createClient } from '@metagptx/web-sdk';

// Single shared client instance — all modules should import from here
export const client = createClient();
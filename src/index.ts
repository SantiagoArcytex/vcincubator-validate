/**
 * @vcincubator/validate — validate VCI Marketplace license codes from your app.
 *
 * Quickstart:
 *
 *   import { createClient } from '@vcincubator/validate';
 *
 *   const vci = createClient({
 *     baseUrl: 'https://marketplace.vcinc.ai',
 *     apiKey: process.env.VCI_API_KEY!,   // your API key from the seller dashboard
 *   });
 *
 *   const result = await vci.validate(userSuppliedCode);
 *   if (result.valid) {
 *     // grant access; status is 'active'
 *   } else {
 *     // result.status tells you why: 'invalid' | 'unauthorized' | 'deal_inactive' |
 *     //                              'rate_limited' | 'network' | 'error'
 *   }
 */

export { createClient } from './client.js';
export type {
  ClientOptions,
  ValidateOptions,
  ValidationClient,
  ValidationResponse,
  ValidationStatus,
} from './types.js';

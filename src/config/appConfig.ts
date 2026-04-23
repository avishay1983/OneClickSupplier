/**
 * Application Configuration
 * Centralized settings for the OneClickSupplier system.
 */

export const APP_CONFIG = {
  /**
   * Default number of days a vendor onboarding link remains active.
   * This can be overridden in specific requests if needed, but the UI 
   * now uses this value globally.
   */
  DEFAULT_LINK_EXPIRY_DAYS: 7,
  
  /**
   * Default vendor type for new requests.
   */
  DEFAULT_VENDOR_TYPE: 'general' as const,
};

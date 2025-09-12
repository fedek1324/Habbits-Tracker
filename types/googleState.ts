export const GoogleState = {
  NOT_CONNECTED: "notConnected",
  HAS_REFRESH_TOKEN: "hasRefreshToken",
  UPDATING: "updating",
  CONNECTED: "connected", 
  ERROR: "error",
} as const;

export type GoogleState = typeof GoogleState[keyof typeof GoogleState];
export const GoogleState = {
  NOT_CONNECTED: "notConnected",
  UPDATING: "updating",
  CONNECTED: "connected", 
  ERROR: "error",
} as const;

export type GoogleState = typeof GoogleState[keyof typeof GoogleState];
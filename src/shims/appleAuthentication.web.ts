/** Web/SSR stub — native Apple Auth has no web AppleButton module. */

const appleAuthStub = {
  isSupported: false,
  Operation: { LOGIN: 0, REFRESH: 1, LOGOUT: 2, IMPLICIT: 3 },
  Scope: { EMAIL: 0, FULL_NAME: 1 },
  State: { REVOKED: 0, AUTHORIZED: 1, NOT_FOUND: 2, TRANSFERRED: 3 },
  UserStatus: { UNSUPPORTED: 0, UNKNOWN: 1, LIKELY_REAL: 2 },
  Error: {
    UNKNOWN: "1000",
    CANCELED: "1001",
    INVALID_RESPONSE: "1002",
    NOT_HANDLED: "1003",
    FAILED: "1004",
  },
  performRequest: async () => {
    throw new Error("Apple Sign-In is not available on web.");
  },
  getCredentialStateForUser: async () => 0,
};

export const appleAuth = appleAuthStub as any;
export const appleAuthAndroid = {
  isSupported: false,
  configure: () => {},
  signIn: async () => {
    throw new Error("Apple Sign-In is not available on web.");
  },
  ResponseType: { ALL: "ALL", CODE: "CODE", ID_TOKEN: "ID_TOKEN" },
  Scope: { ALL: "ALL", EMAIL: "EMAIL", NAME: "NAME" },
  Error: {
    NOT_CONFIGURED: "E_NOT_CONFIGURED_ERROR",
    SIGNIN_FAILED: "E_SIGNIN_FAILED_ERROR",
    SIGNIN_CANCELLED: "E_SIGNIN_CANCELLED_ERROR",
  },
} as any;

export default appleAuth;

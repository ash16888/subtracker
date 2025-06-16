declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback?: (response: GoogleTokenResponse) => void
            error_callback?: (error: GoogleTokenError) => void
          }) => GoogleTokenClient
        }
      }
    }
  }
}

export interface GoogleTokenResponse {
  access_token: string
  expires_in?: number
  error?: string
}

export interface GoogleTokenError {
  type: string
  message: string
}

export interface GoogleTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void
}
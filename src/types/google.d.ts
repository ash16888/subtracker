declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void
      client: {
        init: (config: {
          apiKey?: string
          discoveryDocs?: string[]
        }) => Promise<void>
        calendar: {
          events: {
            insert: (params: {
              calendarId: string
              resource: Record<string, unknown>
            }) => Promise<{ result: { id: string } }>
            update: (params: {
              calendarId: string
              eventId: string
              resource: Record<string, unknown>
            }) => Promise<{ result: { id: string } }>
            delete: (params: {
              calendarId: string
              eventId: string
            }) => Promise<void>
          }
        }
      }
    }
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
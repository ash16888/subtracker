declare global {
  interface Window {
    gapi: typeof gapi & {
      load: (api: string, callback: () => void) => void
      client: gapi.Client & {
        init: (config: {
          apiKey?: string
          discoveryDocs?: string[]
        }) => Promise<void>
        calendar: {
          events: {
            insert: (params: {
              calendarId: string
              resource: gapi.client.calendar.EventResource
            }) => Promise<{ result: { id: string } }>
            update: (params: {
              calendarId: string
              eventId: string
              resource: gapi.client.calendar.EventResource
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

// Расширяем типы gapi для calendar API
declare namespace gapi.client {
  namespace calendar {
    interface EventResource {
      summary?: string
      description?: string
      start?: {
        dateTime?: string
        date?: string
        timeZone?: string
      }
      end?: {
        dateTime?: string
        date?: string
        timeZone?: string
      }
      reminders?: {
        useDefault?: boolean
        overrides?: Array<{
          method: 'email' | 'popup'
          minutes: number
        }>
      }
      [key: string]: unknown
    }
  }
}
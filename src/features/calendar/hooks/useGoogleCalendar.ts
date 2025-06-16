import { useState, useCallback, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { GoogleTokenClient } from '../../../types/google'

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

interface CalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  reminders: {
    useDefault: false;
    overrides: [
      {
        method: 'popup';
        minutes: number;
      }
    ];
  };
}

export const useGoogleCalendar = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [tokenClient, setTokenClient] = useState<GoogleTokenClient | null>(null);

  useEffect(() => {
    const loadGoogleApis = async () => {
      // Load GAPI script
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      
      // Load Google Identity Services script
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;

      gapiScript.onload = () => {
        window.gapi.load('client', initializeGapiClient);
      };

      gisScript.onload = () => {
        initializeTokenClient();
      };

      document.body.appendChild(gapiScript);
      document.body.appendChild(gisScript);
    };

    const initializeGapiClient = async () => {
      try {
        await window.gapi.client.init({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        setIsLoaded(true);
      } catch (error) {
        console.error('Error initializing GAPI client:', error);
      }
    };

    const initializeTokenClient = () => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Error getting access token:', tokenResponse.error);
            return;
          }
          setIsSignedIn(true);
        },
      });
      setTokenClient(client);
    };

    loadGoogleApis();
  }, []);

  const requestCalendarAccess = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  }, [tokenClient]);

  const createSubscriptionReminder = useCallback(async (
    subscriptionName: string,
    amount: number,
    currency: string,
    nextPaymentDate: Date
  ) => {
    if (!isLoaded || !isSignedIn) {
      throw new Error('Google Calendar API не загружен или пользователь не авторизован');
    }

    try {
      // Создаем дату напоминания (за 3 дня до платежа)
      const reminderDate = subDays(nextPaymentDate, 3);
      
      // Форматируем даты для Google Calendar API
      const startDateTime = format(reminderDate, "yyyy-MM-dd'T'10:00:00", { locale: ru });
      const endDateTime = format(reminderDate, "yyyy-MM-dd'T'10:30:00", { locale: ru });
      
      const event: CalendarEvent = {
        summary: `💳 Напоминание: ${subscriptionName}`,
        description: `Через 3 дня будет списание ${amount} ${currency} за подписку на ${subscriptionName}.\n\nСоздано через SubTracker.`,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            {
              method: 'popup',
              minutes: 0,
            },
          ],
        },
      };

      const response = await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event as gapi.client.calendar.EventResource,
      });

      return response.result.id;
    } catch (error) {
      console.error('Ошибка при создании события в календаре:', error);
      throw error;
    }
  }, [isLoaded, isSignedIn]);

  const updateSubscriptionReminder = useCallback(async (
    eventId: string,
    subscriptionName: string,
    amount: number,
    currency: string,
    nextPaymentDate: Date
  ) => {
    if (!isLoaded || !isSignedIn) {
      throw new Error('Google Calendar API не загружен или пользователь не авторизован');
    }

    try {
      // Создаем дату напоминания (за 3 дня до платежа)
      const reminderDate = subDays(nextPaymentDate, 3);
      
      // Форматируем даты для Google Calendar API
      const startDateTime = format(reminderDate, "yyyy-MM-dd'T'10:00:00", { locale: ru });
      const endDateTime = format(reminderDate, "yyyy-MM-dd'T'10:30:00", { locale: ru });
      
      const event: CalendarEvent = {
        summary: `💳 Напоминание: ${subscriptionName}`,
        description: `Через 3 дня будет списание ${amount} ${currency} за подписку на ${subscriptionName}.\n\nСоздано через SubTracker.`,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            {
              method: 'popup',
              minutes: 0,
            },
          ],
        },
      };

      const response = await window.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event as gapi.client.calendar.EventResource,
      });

      return response.result.id;
    } catch (error) {
      console.error('Ошибка при обновлении события в календаре:', error);
      throw error;
    }
  }, [isLoaded, isSignedIn]);

  const deleteSubscriptionReminder = useCallback(async (eventId: string) => {
    if (!isLoaded || !isSignedIn) {
      throw new Error('Google Calendar API не загружен или пользователь не авторизован');
    }

    try {
      await window.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      console.error('Ошибка при удалении события из календаря:', error);
      throw error;
    }
  }, [isLoaded, isSignedIn]);

  return {
    isLoaded,
    isSignedIn,
    requestCalendarAccess,
    createSubscriptionReminder,
    updateSubscriptionReminder,
    deleteSubscriptionReminder,
  };
};
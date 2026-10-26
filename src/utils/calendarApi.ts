export interface CalendarEventPayload {
  summary: string;
  description?: string;
  startDateTime: string; // ISO 8601 string or YYYY-MM-DD
  endDateTime: string;
  isAllDay?: boolean;
  reminderMinutes?: number;
  location?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  htmlLink?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

export async function createCalendarEvent(
  accessToken: string,
  payload: CalendarEventPayload
): Promise<GoogleCalendarEvent> {
  const body: any = {
    summary: payload.summary,
    description: payload.description,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: payload.reminderMinutes ?? 15 },
        { method: 'popup', minutes: 60 },
      ],
    },
  };

  if (payload.location) {
    body.location = payload.location;
  }

  if (payload.isAllDay) {
    const startDateOnly = payload.startDateTime.split('T')[0];
    const endDateOnly = payload.endDateTime.split('T')[0];
    body.start = { date: startDateOnly };
    body.end = { date: endDateOnly };
  } else {
    body.start = {
      dateTime: new Date(payload.startDateTime).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
    };
    body.end = {
      dateTime: new Date(payload.endDateTime).toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
    };
  }

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal menambahkan acara ke Google Calendar');
  }

  return response.json();
}

export async function listUpcomingCalendarEvents(
  accessToken: string,
  maxResults = 10
): Promise<GoogleCalendarEvent[]> {
  const now = new Date().toISOString();
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', now);
  url.searchParams.set('maxResults', maxResults.toString());
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal memuat daftar acara dari Google Calendar');
  }

  const data = await response.json();
  return data.items || [];
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
  eventTitle: string
): Promise<void> {
  // Mandatory explicit confirmation dialog for destructive operation
  const confirmed = window.confirm(
    `Apakah Anda yakin ingin menghapus acara "${eventTitle}" dari Google Calendar Anda? Tindakan ini tidak dapat dibatalkan.`
  );
  if (!confirmed) {
    return;
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal menghapus acara dari Google Calendar');
  }
}

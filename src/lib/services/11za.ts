import { logStructured } from '@/lib/utils';

export interface ButtonMessage {
  to: string;
  text: string;
  buttons: Array<{ id: string; title: string }>;
}

export interface ListMessage {
  to: string;
  title: string;
  body: string;
  rows: Array<{ id: string; title: string; description?: string }>;
}

export class ElevenZaService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.ELEVENZA_API_KEY || '';
    this.baseUrl = process.env.ELEVENZA_BASE_URL || '';
  }

  async sendTextMessage(to: string, text: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/send_message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          text,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();
      logStructured('info', '11za text message sent', {
        to,
        messageId: data.messageId,
      });

      return data.messageId;
    } catch (error) {
      logStructured('error', '11za send error', { error, to });
      throw error;
    }
  }

  async sendButtonMessage(params: ButtonMessage): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/send_message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();
      logStructured('info', '11za button message sent', {
        to: params.to,
        messageId: data.messageId,
        buttonCount: params.buttons.length,
      });

      return data.messageId;
    } catch (error) {
      logStructured('error', '11za button send error', { error });
      throw error;
    }
  }

  async sendListMessage(params: ListMessage): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/send_message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();
      logStructured('info', '11za list message sent', {
        to: params.to,
        messageId: data.messageId,
        rowCount: params.rows.length,
      });

      return data.messageId;
    } catch (error) {
      logStructured('error', '11za list send error', { error });
      throw error;
    }
  }
}

export function get11zaService(): ElevenZaService {
  return new ElevenZaService();
}

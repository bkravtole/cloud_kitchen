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
      const url = `${this.baseUrl}/sendMessage/sendMessages`;
      
      logStructured('info', '11za sendTextMessage starting', {
        to,
        textLength: text.length,
        url,
        apiKeyLength: this.apiKey.length,
        baseUrl: this.baseUrl,
      });

      const response = await fetch(url, {
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

      logStructured('info', '11za response received', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logStructured('error', '11za API error response', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText.substring(0, 200),
          url,
        });
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
      }

      const data: any = await response.json();
      logStructured('info', '11za text message sent', {
        to,
        messageId: data.messageId,
      });

      return data.messageId;
    } catch (error: any) {
      logStructured('error', '11za send error', { 
        error: error?.message || String(error),
        to,
        baseUrl: this.baseUrl,
        apiKeySet: !!this.apiKey
      });
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

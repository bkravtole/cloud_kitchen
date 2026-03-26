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
  private originWebsite: string;

  constructor() {
    this.apiKey = process.env.ELEVENZA_API_KEY || '';
    this.baseUrl = process.env.ELEVENZA_BASE_URL || '';
    this.originWebsite = process.env['11ZA_ORIGIN_WEBSITE'] || '';
  }

  /**
   * Format phone number for 11za API
   * 11za expects: 91XXXXXXXXXX format (without + prefix based on error)
   */
  private formatPhoneFor11za(phone: string): string {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // If already 12 digits and starts with 91, return as is (no + prefix)
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    
    // If 10 digits (without country code), add 91
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    
    // If already starts with 91, just return
    if (cleaned.startsWith('91')) {
      return cleaned;
    }
    
    // Default: try adding 91
    return `91${cleaned}`;
  }

  async sendTextMessage(to: string, text: string): Promise<string> {
    try {
      // Format phone number for 11za
      const sendto = this.formatPhoneFor11za(to);
      const url = `${this.baseUrl}/sendMessage/sendMessages`;
      
      logStructured('info', '11za sendTextMessage starting', {
        originalPhone: to,
        sendto,
        textLength: text.length,
        url,
      });

      // Use correct 11za API payload format
      const payload = {
        sendto,
        authToken: this.apiKey,
        originWebsite: this.originWebsite,
        contentType: 'text',
        text,
      };

      logStructured('info', '11za payload prepared', {
        sendto,
        payloadKeys: Object.keys(payload),
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
          sendto,
        });
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
      }

      const data: any = await response.json();
      logStructured('info', '11za text message sent', {
        sendto,
        messageId: data.messageId || data.id || 'success',
      });

      return data.messageId || data.id || 'sent';
    } catch (error: any) {
      logStructured('error', '11za send error', { 
        error: error?.message || String(error),
        to,
        apiKeySet: !!this.apiKey,
        originWebsiteSet: !!this.originWebsite,
      });
      throw error;
    }
  }

  async sendButtonMessage(params: ButtonMessage): Promise<string> {
    try {
      const formattedPhone = this.formatPhoneFor11za(params.to);
      const url = `${this.baseUrl}/sendMessage/sendMessages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          to: formattedPhone,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logStructured('error', '11za button API error', {
          status: response.status,
          errorBody: errorText.substring(0, 200),
        });
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();
      logStructured('info', '11za button message sent', {
        to: formattedPhone,
        messageId: data.messageId,
        buttonCount: params.buttons.length,
      });

      return data.messageId;
    } catch (error: any) {
      logStructured('error', '11za button send error', { 
        error: error?.message || String(error)
      });
      throw error;
    }
  }

  async sendListMessage(params: ListMessage): Promise<string> {
    try {
      const formattedPhone = this.formatPhoneFor11za(params.to);
      const url = `${this.baseUrl}/sendMessage/sendMessages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          to: formattedPhone,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logStructured('error', '11za list API error', {
          status: response.status,
          errorBody: errorText.substring(0, 200),
        });
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();
      logStructured('info', '11za list message sent', {
        to: formattedPhone,
        messageId: data.messageId,
        rowCount: params.rows.length,
      });

      return data.messageId;
    } catch (error: any) {
      logStructured('error', '11za list send error', { 
        error: error?.message || String(error)
      });
      throw error;
    }
  }
}

export function get11zaService(): ElevenZaService {
  return new ElevenZaService();
}

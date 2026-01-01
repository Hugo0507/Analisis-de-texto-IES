/**
 * Google Drive OAuth 2.0 Service
 *
 * Handles the complete OAuth flow for Google Drive:
 * 1. Get authorization URL from backend
 * 2. Open popup for user authorization
 * 3. Receive authorization code via postMessage
 * 4. Exchange code for tokens
 * 5. Manage connection status
 */

import apiClient from './api';

/**
 * Google Drive connection status
 */
export interface GoogleDriveConnection {
  is_connected: boolean;
  email?: string;
  connected_at?: string;
  scopes?: string[];
}

/**
 * Authorization URL response from backend
 */
export interface AuthorizeUrlResponse {
  authorization_url: string;
  state: string;
}

/**
 * OAuth code from callback
 */
interface OAuthCallbackData {
  code: string;
  state: string;
}

class GoogleDriveService {
  /**
   * Get current Google Drive connection status
   */
  async getConnectionStatus(): Promise<GoogleDriveConnection> {
    const response = await apiClient.get<GoogleDriveConnection>(
      '/oauth/google-drive/status/'
    );
    return response.data;
  }

  /**
   * Get authorization URL to start OAuth flow
   */
  async getAuthorizationUrl(): Promise<AuthorizeUrlResponse> {
    const response = await apiClient.get<AuthorizeUrlResponse>(
      '/oauth/google-drive/authorize-url/'
    );
    return response.data;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string, state: string): Promise<void> {
    await apiClient.post('/oauth/google-drive/exchange-code/', {
      code,
      state,
    });
  }

  /**
   * Disconnect Google Drive account
   */
  async disconnect(): Promise<void> {
    await apiClient.post('/oauth/google-drive/disconnect/');
  }

  /**
   * Open OAuth popup window and wait for authorization
   *
   * @param authorizationUrl - Google OAuth URL
   * @returns Promise that resolves with code and state when user authorizes
   */
  openOAuthPopup(authorizationUrl: string): Promise<OAuthCallbackData> {
    return new Promise((resolve, reject) => {
      // Calculate centered position
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // Open popup
      const popup = window.open(
        authorizationUrl,
        'Google Drive Authorization',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups for this site.'));
        return;
      }

      // Listen for message from callback page
      const messageListener = (event: MessageEvent) => {
        // Security: Verify origin
        if (event.origin !== window.location.origin) {
          return;
        }

        // Handle success
        if (event.data.type === 'GOOGLE_DRIVE_OAUTH_SUCCESS') {
          window.removeEventListener('message', messageListener);
          clearInterval(checkClosed);

          if (!popup.closed) {
            popup.close();
          }

          resolve({
            code: event.data.code,
            state: event.data.state,
          });
        }

        // Handle error
        else if (event.data.type === 'GOOGLE_DRIVE_OAUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          clearInterval(checkClosed);

          if (!popup.closed) {
            popup.close();
          }

          reject(new Error(event.data.error || 'OAuth authorization failed'));
        }
      };

      window.addEventListener('message', messageListener);

      // Check if popup was closed manually
      // Use try-catch to handle COOP (Cross-Origin-Opener-Policy) errors
      const checkClosed = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            reject(new Error('Authorization window closed'));
          }
        } catch (error) {
          // Ignore COOP errors - Google's Cross-Origin-Opener-Policy blocks popup.closed
          // The popup will send postMessage when done, so this is just a fallback
        }
      }, 500);
    });
  }

  /**
   * Complete OAuth flow (convenience method)
   *
   * Orchestrates the entire flow:
   * 1. Get authorization URL from backend
   * 2. Open popup for user to authorize
   * 3. Exchange code for tokens
   * 4. Return updated connection status
   */
  async connect(): Promise<GoogleDriveConnection> {
    try {
      // Step 1: Get authorization URL
      const { authorization_url } = await this.getAuthorizationUrl();

      // Step 2: Open popup and wait for code
      const { code, state: returnedState } = await this.openOAuthPopup(authorization_url);

      // Step 3: Exchange code for tokens
      await this.exchangeCode(code, returnedState);

      // Step 4: Get updated connection status
      return await this.getConnectionStatus();
    } catch (error) {
      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to connect Google Drive');
    }
  }

  /**
   * Refresh connection status (alias for getConnectionStatus)
   */
  async refresh(): Promise<GoogleDriveConnection> {
    return this.getConnectionStatus();
  }
}

// Export singleton instance
export default new GoogleDriveService();

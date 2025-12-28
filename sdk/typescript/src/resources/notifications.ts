/**
 * Notifications Resource
 * 
 * In-app notification management
 */

import type { HttpClient } from "../http.js";
import type { RosetClientConfig, RequestOptions } from "../types.js";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationSettings {
  [key: string]: boolean;
}

export interface NotificationsListResult {
  items: Notification[];
  unreadCount: number;
  pagination: {
    limit: number;
    offset: number;
  };
}

export class NotificationsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * List notifications for the current user
   * 
   * @example
   * const { items, unreadCount } = await client.notifications.list()
   */
  async list(options?: { 
    unreadOnly?: boolean; 
    limit?: number; 
    offset?: number 
  } & RequestOptions): Promise<NotificationsListResult> {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.set('unreadOnly', 'true');
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    
    const query = params.toString();
    return this.http.get<NotificationsListResult>(
      `/v1/notifications${query ? `?${query}` : ''}`,
      options
    );
  }

  /**
   * Mark a notification as read
   */
  async markRead(id: string, options?: RequestOptions): Promise<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `/v1/notifications/${id}/read`,
      {},
      options
    );
  }

  /**
   * Mark all notifications as read
   */
  async markAllRead(options?: RequestOptions): Promise<{ success: boolean; markedCount: number }> {
    return this.http.post<{ success: boolean; markedCount: number }>(
      `/v1/notifications/read-all`,
      {},
      options
    );
  }

  /**
   * Get notification settings
   */
  async getSettings(options?: RequestOptions): Promise<{ settings: NotificationSettings }> {
    return this.http.get<{ settings: NotificationSettings }>(
      '/v1/notifications/settings',
      options
    );
  }

  /**
   * Update notification settings
   */
  async updateSettings(settings: NotificationSettings, options?: RequestOptions): Promise<{ success: boolean; settings: NotificationSettings }> {
    return this.http.put<{ success: boolean; settings: NotificationSettings }>(
      '/v1/notifications/settings',
      settings,
      options
    );
  }
}

import { HttpClient } from "../http.js";
import { RosetClientConfig } from "../types.js";

/**
 * User Profile Resource
 * 
 * Manage the current user's profile and preferences
 */
export class UserResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: RosetClientConfig
  ) {}

  /**
   * Get the current user's profile
   * 
   * @example
   * const profile = await client.user.getProfile()
   * console.log(profile.displayName)
   */
  async getProfile(): Promise<UserProfile> {
    return this.http.get<UserProfile>("/v1/user/profile");
  }

  /**
   * Update the current user's profile
   * 
   * @example
   * await client.user.updateProfile({ displayName: 'New Name' })
   */
  async updateProfile(updates: UserProfileUpdate): Promise<UserProfile> {
    return this.http.patch<UserProfile>("/v1/user/profile", updates);
  }
}

export interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileUpdate {
  displayName?: string;
  preferences?: Record<string, unknown>;
}

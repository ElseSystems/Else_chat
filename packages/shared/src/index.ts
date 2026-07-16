export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  AGENT = 'AGENT',
}

export enum ConversationStatus {
  WAITING = 'WAITING',
  ASSIGNED = 'ASSIGNED',
  RESOLVED = 'RESOLVED',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  STICKER = 'STICKER',
}

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
}

export const canSeeAllConversations = (role: UserRole) =>
  role === UserRole.ADMIN ||
  role === UserRole.SUPERVISOR ||
  role === UserRole.SUPERADMIN;

export const isTenantStaff = (role: UserRole) =>
  role === UserRole.ADMIN ||
  role === UserRole.SUPERVISOR ||
  role === UserRole.AGENT;

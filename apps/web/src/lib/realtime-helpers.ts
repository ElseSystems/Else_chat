import { canSeeAllConversations, UserRole } from '@else-chat/shared';
import { API_URL, getToken, getUser, SessionUser } from './api';

export { API_URL, getToken, getUser };

export function canFilterMessage(
  user: SessionUser,
  visibility: { assignedToId: string | null; status: string },
) {
  if (canSeeAllConversations(user.role as UserRole)) return true;
  if (visibility.status === 'WAITING') return true;
  return visibility.assignedToId === user.id;
}

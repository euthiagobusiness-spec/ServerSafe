export type ChatRole = "user" | "assistant";

export type AttachmentMediaType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain";

export type ChatAttachment = {
  attachment_id: string;
  name: string;
  media_type: AttachmentMediaType;
  size_bytes: number;
};

export type AttachmentMetadata = ChatAttachment & {
  extracted_chars: number;
  created_at: string;
  expires_at: string | null;
};

export type ChatMessage = {
  role: ChatRole;
  text: string;
  attachments?: ChatAttachment[];
};

export type Conversation = {
  conversation_id: string;
  project_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  attachments?: AttachmentMetadata[];
  permanence_enabled?: boolean;
};

export type Project = {
  project_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type OwnerState = {
  version: 1;
  projects: Project[];
  conversations: Conversation[];
};

export const emptyOwnerState = (): OwnerState => ({
  version: 1,
  projects: [],
  conversations: [],
});

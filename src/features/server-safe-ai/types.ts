export type ChatRole = "user" | "assistant";

export type ModelKey = "haiku-4-5" | "sonnet-5" | "opus-5";

export const ATTACHMENT_MIME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
} as const;
export const ATTACHMENT_EXTENSIONS: readonly string[] = [".pdf", ".docx", ".pptx", ".txt"];

export type ModelMetadata = {
  key: ModelKey;
  displayName: string;
  default: boolean;
};

export type AttachmentMediaType =
  typeof ATTACHMENT_MIME_TYPES[keyof typeof ATTACHMENT_MIME_TYPES];

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
  model_key?: ModelKey;
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

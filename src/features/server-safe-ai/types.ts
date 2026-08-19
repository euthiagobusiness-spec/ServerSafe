export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  text: string;
};

export type Conversation = {
  conversation_id: string;
  project_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
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

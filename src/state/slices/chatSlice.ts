import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  sessionId: string;
}

const initialState: ChatState = {
  isOpen: false,
  messages: [],
  isLoading: false,
  isStreaming: false,
  sessionId: "0",
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    toggleChat(state) {
      state.isOpen = !state.isOpen;
    },
    openChat(state) {
      state.isOpen = true;
    },
    closeChat(state) {
      state.isOpen = false;
    },
    addMessage(state, action: PayloadAction<Omit<ChatMessage, "id" | "timestamp">>) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: action.payload.text,
        sender: action.payload.sender,
        timestamp: Date.now(),
      };
      state.messages.push(newMessage);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload;
    },
    setSessionId(state, action: PayloadAction<string>) {
      state.sessionId = action.payload;
    },
    clearMessages(state) {
      state.messages = [];
      state.sessionId = "0";
    },
    // Add user message and set loading
    sendUserMessage(state, action: PayloadAction<string>) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: action.payload,
        sender: "user",
        timestamp: Date.now(),
      };
      state.messages.push(userMessage);
      state.isLoading = true;
      state.isStreaming = false;
    },
    // Start AI streaming response - creates empty AI message
    startAiStreamResponse(state) {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        text: "",
        sender: "ai",
        timestamp: Date.now(),
        isStreaming: true,
      };
      state.messages.push(aiMessage);
      state.isLoading = false;
      state.isStreaming = true;
    },
    // Append token to the last AI message
    appendTokenToLastMessage(state, action: PayloadAction<string>) {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.sender === "ai") {
        lastMessage.text += action.payload;
      }
    },
    // Complete AI streaming response
    completeAiStreamResponse(state, action: PayloadAction<{ fullResponse: string; sessionId: string }>) {
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.sender === "ai") {
        lastMessage.text = action.payload.fullResponse;
        lastMessage.isStreaming = false;
      }
      state.isStreaming = false;
      state.isLoading = false;
      state.sessionId = action.payload.sessionId;
    },
    // Handle streaming error
    streamError(state) {
      // Remove the last AI message if it was streaming
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.sender === "ai" && lastMessage.isStreaming) {
        state.messages.pop();
      }
      state.isStreaming = false;
      state.isLoading = false;
    },
    // Legacy methods for backward compatibility
    sendMessageAndGetResponse(state, action: PayloadAction<string>) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: action.payload,
        sender: "user",
        timestamp: Date.now(),
      };
      state.messages.push(userMessage);
      state.isLoading = true;
    },
    receiveAiResponse(state, action: PayloadAction<string>) {
      const aiMessage: ChatMessage = {
        id: Date.now().toString(),
        text: action.payload,
        sender: "ai",
        timestamp: Date.now(),
      };
      state.messages.push(aiMessage);
      state.isLoading = false;
    },
  },
});

export const {
  toggleChat,
  openChat,
  closeChat,
  addMessage,
  setLoading,
  setStreaming,
  setSessionId,
  clearMessages,
  sendUserMessage,
  startAiStreamResponse,
  appendTokenToLastMessage,
  completeAiStreamResponse,
  streamError,
  sendMessageAndGetResponse,
  receiveAiResponse,
} = chatSlice.actions;

export default chatSlice.reducer;

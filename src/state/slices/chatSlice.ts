import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: number;
}

export interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
}

const initialState: ChatState = {
  isOpen: false,
  messages: [],
  isLoading: false,
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
    clearMessages(state) {
      state.messages = [];
    },
    // Static AI response for now - will be replaced with actual API call later
    sendMessageAndGetResponse(state, action: PayloadAction<string>) {
      // Add user message
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
  clearMessages,
  sendMessageAndGetResponse,
  receiveAiResponse,
} = chatSlice.actions;

export default chatSlice.reducer;

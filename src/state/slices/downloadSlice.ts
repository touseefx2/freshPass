import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface DownloadState {
  /** URL of the media currently being downloaded; null when idle */
  downloadingUrl: string | null;
}

const initialState: DownloadState = {
  downloadingUrl: null,
};

const downloadSlice = createSlice({
  name: "download",
  initialState,
  reducers: {
    setDownloadingUrl(state, action: PayloadAction<string | null>) {
      state.downloadingUrl = action.payload;
    },
  },
});

export const { setDownloadingUrl } = downloadSlice.actions;
export default downloadSlice.reducer;

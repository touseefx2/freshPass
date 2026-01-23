import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Category {
  id: number;
  name: string;
  image: string | null;
}

export interface CategoriesState {
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  selectedCategory: string | number | undefined;
}

const initialState: CategoriesState = {
  categories: [],
  categoriesLoading: false,
  categoriesError: false,
  selectedCategory: undefined,
};

const categoriesSlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    resetCategories: () => initialState,
    setCategories(state, action: PayloadAction<Category[]>) {
      state.categories = action.payload;
    },
    setCategoriesLoading(state, action: PayloadAction<boolean>) {
      state.categoriesLoading = action.payload;
    },
    setCategoriesError(state, action: PayloadAction<boolean>) {
      state.categoriesError = action.payload;
    },
    setSelectedCategory(
      state,
      action: PayloadAction<string | number | undefined>,
    ) {
      state.selectedCategory = action.payload;
    },
  },
});

export const {
  setCategories,
  setCategoriesLoading,
  setCategoriesError,
  setSelectedCategory,
  resetCategories,
} = categoriesSlice.actions;

export default categoriesSlice.reducer;

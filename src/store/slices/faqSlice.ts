import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authenticatedRequest } from '../../services/api/apiclient';
import { API_CONFIG } from '../../config/api';

export interface FAQItem {
    id: number;
    question: string;
    answer: string;
    created_at: string;
    updated_at: string;
}

interface FAQResponse {
    faqs: FAQItem[];
}

interface FAQState {
    items: FAQItem[];
    loading: boolean;
    error: string | null;
}

const initialState: FAQState = {
    items: [],
    loading: false,
    error: null,
};

export const fetchFAQs = createAsyncThunk<FAQItem[], void>(
    'faq/fetchFAQs',
    async (_, { rejectWithValue }) => {
        try {
            // Use direct URL as specified by user or fallback to config if we want to be cleaner later.
            // User specified: https://trivia-back-end.vercel.app/faqs
            // We'll use the authenticatedRequest helper which likely handles base URL.
            // Let's check API_CONFIG usage, usually it has BASE_URL.
            // For now, I'll use the full URL if authenticatedRequest supports it, or constructing it.
            // Assuming authenticatedRequest takes a full URL or relative path.
            // Based on previous code in useChatDetailLogic.ts:
            // authenticatedRequest(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS...}`)

            // I will assume for now I should use the full URL provided by the user.
            const response = await authenticatedRequest('https://trivia-back-end.vercel.app/faqs', {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch FAQs');
            }

            const data: FAQResponse = await response.json();
            return data.faqs;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch FAQs');
        }
    }
);

const faqSlice = createSlice({
    name: 'faq',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchFAQs.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchFAQs.fulfilled, (state, action: PayloadAction<FAQItem[]>) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchFAQs.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export default faqSlice.reducer;

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface VAIState {
  vaiNumber: string | null;
  verificationRecordId: string | null;
  isLEO: boolean;
  isGenerating: boolean;
  generatedAt: string | null;
  
  setVAI: (vaiNumber: string, recordId: string, isLEO: boolean) => void;
  clearVAI: () => void;
  setGenerating: (isGenerating: boolean) => void;
}

export const useVAIStore = create<VAIState>()(
  persist(
    (set) => ({
      vaiNumber: null,
      verificationRecordId: null,
      isLEO: false,
      isGenerating: false,
      generatedAt: null,
      
      setVAI: (vaiNumber, recordId, isLEO) => set({
        vaiNumber,
        verificationRecordId: recordId,
        isLEO,
        generatedAt: new Date().toISOString(),
        isGenerating: false
      }),
      
      clearVAI: () => set({
        vaiNumber: null,
        verificationRecordId: null,
        isLEO: false,
        isGenerating: false,
        generatedAt: null
      }),
      
      setGenerating: (isGenerating) => set({ isGenerating })
    }),
    {
      name: 'chainpass-vai-storage',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);

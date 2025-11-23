declare module 'react-native-tesseract-ocr' {
  export const LANG_ARABIC: string;
  export interface TesseractModule {
    recognize: (uri: string, language: string, options?: Record<string, any>) => Promise<string>;
  }
  const TesseractOcr: TesseractModule;
  export default TesseractOcr;
}

declare module 'expo-mlkit-ocr' {
  export interface MlKitTextElement {
    text: string;
    cornerPoints?: Array<{ x: number; y: number }>;
  }

  export interface MlKitTextLine {
    text: string;
    elements: MlKitTextElement[];
    cornerPoints?: Array<{ x: number; y: number }>;
  }

  export interface MlKitTextBlock {
    text: string;
    lines: MlKitTextLine[];
    cornerPoints?: Array<{ x: number; y: number }>;
  }

  export interface MlKitTextResult {
    text: string;
    blocks: MlKitTextBlock[];
  }

  export interface ExpoMlkitOcrModule {
    recognizeText(uri: string): Promise<MlKitTextResult>;
  }

  const module: ExpoMlkitOcrModule;
  export default module;
}

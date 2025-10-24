import { GoogleGenAI, Modality } from "@google/genai";
import { IMAGE_GENERATION_MODEL, IMAGE_EDITING_MODEL } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface GenerateImageOptions {
  style: 'realistic' | 'anime' | 'fantasy';
  quality: 'standard' | 'hd';
  aspectRatio: '1:1' | '9:16' | '16:9';
}

export const generateImage = async (prompt: string, options: GenerateImageOptions): Promise<string> => {
  try {
    let fullPrompt = prompt;
    
    // Modify prompt based on style
    switch (options.style) {
        case 'realistic':
            fullPrompt = `ultra-realistic photo, cinematic lighting, ${prompt}`;
            break;
        case 'anime':
            fullPrompt = `anime style, vibrant colors, detailed, ${prompt}`;
            break;
        case 'fantasy':
            fullPrompt = `fantasy art, epic, magical, intricate details, ${prompt}`;
            break;
    }

    // Modify prompt based on quality
    if (options.quality === 'hd') {
        fullPrompt += ', 4k, high resolution, sharp focus';
    }

    const response = await ai.models.generateImages({
      model: IMAGE_GENERATION_MODEL,
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: options.aspectRatio,
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image generated.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image. Please try again.");
  }
};

export interface EditedImageResult {
  imageUrl: string | null;
  text: string | null;
}

export const editImage = async (
  prompt: string,
  base64ImageData: string,
  mimeType: string,
  isProMode: boolean,
  strength: number
): Promise<EditedImageResult> => {
  try {
    let instructionPrefix = '';

    if (strength < 0.3) {
      instructionPrefix = 'Make a very subtle and minor adjustment to the image';
    } else if (strength >= 0.3 && strength < 0.7) {
      instructionPrefix = 'Make a moderate adjustment to the image';
    } else { // strength >= 0.7
      instructionPrefix = 'Make a significant and noticeable change to the image';
    }
    
    if (isProMode) {
      instructionPrefix += ', applying a highly creative and dramatic interpretation';
    }
    
    const finalPrompt = `${instructionPrefix}, based on the following instruction: ${prompt}`;

    const response = await ai.models.generateContent({
      model: IMAGE_EDITING_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          { text: finalPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const result: EditedImageResult = { imageUrl: null, text: null };
    const parts = response.candidates?.[0]?.content?.parts;

    if (Array.isArray(parts)) {
      for (const part of parts) {
        if (part.text) {
          result.text = part.text;
        } else if (part.inlineData?.data && part.inlineData?.mimeType) {
          const base64ImageBytes: string = part.inlineData.data;
          result.imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
      }
    }
    
    if (!result.imageUrl) {
        throw new Error("No edited image was returned from the API.");
    }

    return result;

  } catch (error) {
    console.error("Error editing image:", error);
    throw new Error("Failed to edit image. Please try again.");
  }
};

export const inpaintImage = async (
  prompt: string,
  base64ImageData: string,
  mimeType: string,
  base64MaskData: string
): Promise<EditedImageResult> => {
  try {
    const finalPrompt = `Using the provided white mask on the second image, replace only the masked area of the first (original) image with the following description: "${prompt}". The rest of the image (the black area in the mask) should remain completely unchanged.`;

    const response = await ai.models.generateContent({
      model: IMAGE_EDITING_MODEL,
      contents: {
        parts: [
          { text: finalPrompt },
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            inlineData: {
              data: base64MaskData,
              mimeType: 'image/png', // Mask is always generated as PNG
            },
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const result: EditedImageResult = { imageUrl: null, text: null };
    const parts = response.candidates?.[0]?.content?.parts;

    if (Array.isArray(parts)) {
      for (const part of parts) {
        if (part.text) {
          result.text = part.text;
        } else if (part.inlineData?.data && part.inlineData?.mimeType) {
          const base64ImageBytes: string = part.inlineData.data;
          result.imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
      }
    }
    
    if (!result.imageUrl) {
        throw new Error("Inpainting did not produce a new image.");
    }

    return result;
  } catch (error) {
    console.error("Error inpainting image:", error);
    throw new Error("Failed to inpaint image. Please try again.");
  }
};

export const removeBackground = async (
  base64ImageData: string,
  mimeType: string
): Promise<EditedImageResult> => {
  try {
    const prompt = "Remove the background from this image, leaving only the main subject. The new background should be transparent.";

    const response = await ai.models.generateContent({
      model: IMAGE_EDITING_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const result: EditedImageResult = { imageUrl: null, text: null };
    const parts = response.candidates?.[0]?.content?.parts;

    if (Array.isArray(parts)) {
        for (const part of parts) {
            if (part.text) {
                result.text = part.text;
            } else if (part.inlineData?.data && part.inlineData?.mimeType) {
                const base64ImageBytes: string = part.inlineData.data;
                result.imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
    }
    
    if (!result.imageUrl) {
        throw new Error("Background removal did not produce a new image.");
    }

    return result;

  } catch (error) {
    console.error("Error removing background:", error);
    throw new Error("Failed to remove background. Please try again.");
  }
};

export const sketchToImage = async (
    prompt: string,
    base64SketchData: string
  ): Promise<EditedImageResult> => {
    try {
      const finalPrompt = `Transform this rough sketch into a photorealistic, high-quality image. The user wants to see: "${prompt}". Interpret the shapes and composition in the sketch to create a realistic and detailed final image.`;
  
      const response = await ai.models.generateContent({
        model: IMAGE_EDITING_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                data: base64SketchData,
                mimeType: 'image/png',
              },
            },
            { text: finalPrompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });
  
      const result: EditedImageResult = { imageUrl: null, text: null };
      const parts = response.candidates?.[0]?.content?.parts;
  
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part.text) {
            result.text = part.text;
          } else if (part.inlineData?.data && part.inlineData?.mimeType) {
            const base64ImageBytes: string = part.inlineData.data;
            result.imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
          }
        }
      }
      
      if (!result.imageUrl) {
          throw new Error("Sketch-to-image did not produce a new image.");
      }
  
      return result;
  
    } catch (error) {
      console.error("Error generating from sketch:", error);
      throw new Error("Failed to generate image from sketch. Please try again.");
    }
  };
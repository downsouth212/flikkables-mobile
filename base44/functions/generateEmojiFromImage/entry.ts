export default async function generateEmojiFromImage({ imageUrl, characterName }) {
  const result = await base44.integrations.Core.GenerateImage({
    prompt: `Cute emoji-style flat icon character design, simple rounded kawaii aesthetic, minimalist vector style, clean lines, white background, playful and friendly`,
    existing_image_urls: [imageUrl]
  });
  
  return result;
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Sparkles, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCharacters() {
  const [originalUrl, setOriginalUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedEmoji, setGeneratedEmoji] = useState(null);
  const [characterName, setCharacterName] = useState('');
  const [rarity, setRarity] = useState('common');
  const [description, setDescription] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setOriginalUrl(result.file_url);
      toast.success('Image uploaded!');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const generateEmoji = async () => {
    if (!originalUrl) return;

    setGenerating(true);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `Create a simple, cute emoji-style icon of this ${characterName || 'Flikkable'}. The style should be: clean flat design, bold colors, minimal details, circular or rounded shape, friendly and playful appearance, suitable as an app icon or game character avatar. Keep it simple and iconic.`,
        existing_image_urls: [originalUrl]
      });
      setGeneratedEmoji(result.url);
      toast.success('Emoji generated!');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate emoji');
    } finally {
      setGenerating(false);
    }
  };

  const saveTemplate = async () => {
    if (!generatedEmoji || !characterName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await base44.entities.CharacterTemplate.create({
        name: characterName,
        avatar_url: generatedEmoji,
        rarity,
        description
      });
      toast.success('Flikkable template saved!');
      
      // Reset form
      setOriginalUrl('');
      setGeneratedEmoji(null);
      setCharacterName('');
      setRarity('common');
      setDescription('');
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const reset = () => {
    setOriginalUrl('');
    setGeneratedEmoji(null);
    setCharacterName('');
    setDescription('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 p-6 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Flikkable Creator</h1>
          <p className="text-gray-600">Upload Flikkable photos and generate emoji-style designs</p>
        </div>

        <Card className="p-6 mb-6">
          <div className="space-y-6">
            {/* Upload Original */}
            <div>
              <Label>1. Upload Flikkable Photo</Label>
              <div className="mt-2">
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-violet-400 transition-colors bg-white">
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                  ) : originalUrl ? (
                    <div className="text-center">
                      <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <span className="text-sm text-gray-600">Image uploaded</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-600">Click to upload</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Preview Original */}
            {originalUrl && (
              <div>
                <Label>Original Image</Label>
                <div className="mt-2 rounded-xl overflow-hidden bg-white border border-gray-200">
                  <img src={originalUrl} alt="Original" className="w-full h-64 object-contain" />
                </div>
              </div>
            )}

            {/* Generate Button */}
            {originalUrl && !generatedEmoji && (
              <Button
                onClick={generateEmoji}
                disabled={generating}
                className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Emoji...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Emoji Style
                  </>
                )}
              </Button>
            )}

            {/* Preview Generated Emoji */}
            {generatedEmoji && (
              <>
                <div>
                  <Label>Generated Emoji</Label>
                  <div className="mt-2 rounded-xl overflow-hidden bg-white border border-gray-200">
                    <img src={generatedEmoji} alt="Generated" className="w-full h-64 object-contain" />
                  </div>
                </div>

                {/* Character Details */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div>
                    <Label htmlFor="name">Flikkable Name *</Label>
                    <Input
                      id="name"
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                      placeholder="e.g., Sunny Explorer"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="rarity">Rarity *</Label>
                    <Select value={rarity} onValueChange={setRarity}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="common">Common</SelectItem>
                        <SelectItem value="uncommon">Uncommon</SelectItem>
                        <SelectItem value="rare">Rare</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="legendary">Legendary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief description"
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button onClick={reset} variant="outline" className="flex-1">
                    <X className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                  <Button onClick={saveTemplate} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4 mr-2" />
                    Save to Gallery
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
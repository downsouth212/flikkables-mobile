import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Trash2, CheckCircle, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import RarityBadge from '@/components/characters/RarityBadge';

export default function AdminTemplates() {
  const [user, setUser] = useState(null);
  const [count, setCount] = useState(10);
  const [style, setStyle] = useState('cute mascot characters for a travel game');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [showStampCostDialog, setShowStampCostDialog] = useState(false);
  const [selectedTemplateForLock, setSelectedTemplateForLock] = useState(null);
  const [stampCostInput, setStampCostInput] = useState('100');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['characterTemplates'],
    queryFn: async () => {
      const result = await base44.entities.CharacterTemplate.list('-created_date', 1000);
      return result || [];
    },
  });

  const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  const getRandomRarity = () => {
    return rarities[Math.floor(Math.random() * rarities.length)];
  };

  const generateBatchMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      setProgress(0);
      setGeneratedCount(0);
      const created = [];

      for (let i = 0; i < count; i++) {
        try {
          const prompt = `Single character only, ${style}, unique design ${i + 1}, vibrant colors, white background, square format, one character centered`;
          
          const imageResponse = await base44.integrations.Core.GenerateImage({ prompt });
          const imageUrl = imageResponse.url;

          const nameResponse = await base44.integrations.Core.InvokeLLM({
            prompt: `Generate a unique, creative 1-2 word name for a character in a travel/adventure game. Style: ${style}. Make it fun and memorable.`,
            response_json_schema: {
              type: "object",
              properties: {
                name: { type: "string" }
              }
            }
          });

          const template = await base44.entities.CharacterTemplate.create({
            name: nameResponse.name || `Character ${i + 1}`,
            avatar_url: imageUrl,
            description: `A Flikkable ready for adventure!`,
            locked: false,
            stamp_cost: 0,
            published: false
          });

          created.push(template);
          setGeneratedCount(i + 1);
          setProgress(((i + 1) / count) * 100);
        } catch (err) {
          console.error(`Failed to generate template ${i + 1}:`, err);
          toast.error(`Failed to generate character ${i + 1}`);
        }
      }

      return created;
    },
    onSuccess: (created) => {
      setIsGenerating(false);
      queryClient.invalidateQueries({ queryKey: ['characterTemplates'] });
      toast.success(`Created ${created.length} character templates!`);
      setProgress(0);
      setGeneratedCount(0);
    },
    onError: () => {
      setIsGenerating(false);
      setProgress(0);
      setGeneratedCount(0);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (templateId) => base44.entities.CharacterTemplate.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characterTemplates'] });
      toast.success('Template deleted');
    }
  });

  const togglePublishedMutation = useMutation({
    mutationFn: ({ templateId, published }) => 
      base44.entities.CharacterTemplate.update(templateId, { published }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characterTemplates'] });
      toast.success('Template updated');
    }
  });

  const updateLockMutation = useMutation({
    mutationFn: ({ templateId, locked, stamp_cost }) => 
      base44.entities.CharacterTemplate.update(templateId, { locked, stamp_cost }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characterTemplates'] });
      toast.success('Lock settings updated');
    }
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Admin access required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 p-4 pb-24">
      <div className="max-w-4xl mx-auto pt-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Character Templates</h1>
        <p className="text-gray-600 mb-8">Generate AI-powered character designs in bulk</p>

        {/* Generator */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Bulk Generator
            </CardTitle>
            <CardDescription>
              Create multiple unique character templates with AI-generated images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Number of Characters
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                disabled={isGenerating}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Character Style
              </label>
              <Textarea
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="E.g., cute mascot characters for a travel game"
                disabled={isGenerating}
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Describe the visual style and theme for your characters
              </p>
            </div>

            {isGenerating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Generating...</span>
                  <span className="font-medium text-violet-600">{generatedCount} / {count}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <Button
              onClick={() => generateBatchMutation.mutate()}
              disabled={isGenerating || !count || !style}
              className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating {generatedCount}/{count}...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate {count} Characters
                </>
              )}
            </Button>

            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
              <p className="font-medium mb-1">Rarity Assignment:</p>
              <p className="text-blue-700">Rarity is assigned when users create characters (equal 20% chance for each tier)</p>
              <p className="text-blue-700 mt-1">Templates are created as unpublished drafts for admin review</p>
            </div>
          </CardContent>
        </Card>

        {/* Template Library */}
        <Card>
          <CardHeader>
            <CardTitle>Template Library ({templates.length})</CardTitle>
            <CardDescription>All available character templates</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No templates yet. Generate some!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="overflow-hidden w-full">
                    <div className="flex gap-3 p-3">
                      <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {template.avatar_url ? (
                          <img 
                            src={template.avatar_url} 
                            alt={template.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-3xl">🎭</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{template.name}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className={`px-2 py-0.5 rounded ${template.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {template.published ? 'Published' : 'Draft'}
                          </span>
                          {template.locked && (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                              🔒 {template.stamp_cost} stamps
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => togglePublishedMutation.mutate({ 
                              templateId: template.id, 
                              published: !template.published 
                            })}
                          >
                            {template.published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => {
                              setSelectedTemplateForLock(template);
                              setStampCostInput((template.stamp_cost || 100).toString());
                              setShowStampCostDialog(true);
                            }}
                          >
                            {template.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-xs text-red-500"
                            onClick={() => deleteMutation.mutate(template.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stamp Cost Dialog */}
        <Dialog open={showStampCostDialog} onOpenChange={setShowStampCostDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedTemplateForLock?.locked ? 'Edit' : 'Set'} Stamp Cost</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-600">
                How many stamps should users need to unlock <span className="font-semibold">{selectedTemplateForLock?.name}</span>?
              </p>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Stamp Cost
                </label>
                <Input
                  type="number"
                  min="1"
                  value={stampCostInput}
                  onChange={(e) => setStampCostInput(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowStampCostDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                {selectedTemplateForLock?.locked && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedTemplateForLock) {
                        updateLockMutation.mutate({
                          templateId: selectedTemplateForLock.id,
                          locked: false,
                          stamp_cost: 0
                        });
                        setShowStampCostDialog(false);
                      }
                    }}
                    className="flex-1"
                  >
                    Unlock
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (selectedTemplateForLock) {
                      updateLockMutation.mutate({
                        templateId: selectedTemplateForLock.id,
                        locked: true,
                        stamp_cost: parseInt(stampCostInput) || 100
                      });
                      setShowStampCostDialog(false);
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500"
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
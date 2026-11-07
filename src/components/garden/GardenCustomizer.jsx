import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package, Trash2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function GardenCustomizer({ open, onOpenChange, user }) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [longPressItemId, setLongPressItemId] = useState(null);
  const longPressTimers = React.useRef({});

  const { data: userItems = [] } = useQuery({
    queryKey: ['user-garden-items', user?.email],
    queryFn: () => base44.entities.UserGardenItem.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const placeMutation = useMutation({
    mutationFn: async ({ itemId, x, y, emoji, name }) => {
      // Clamp position to keep items within bounds (5% - 95%)
      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));
      
      await base44.entities.UserGardenItem.update(itemId, {
        position_x: clampedX,
        position_y: clampedY,
        decoration_emoji: emoji,
        decoration_name: name,
        is_placed: true
      });
      
      return { itemId, x: clampedX, y: clampedY, emoji, name };
    },
    onMutate: async ({ itemId, x, y, emoji, name }) => {
      // Optimistically update the UI
      const clampedX = Math.max(5, Math.min(95, x));
      const clampedY = Math.max(5, Math.min(95, y));
      
      queryClient.setQueryData(['user-garden-items', user.email], (old = []) => 
        old.map(item => 
          item.id === itemId 
            ? { ...item, position_x: clampedX, position_y: clampedY, decoration_emoji: emoji, decoration_name: name, is_placed: true }
            : item
        )
      );
    },
    onSuccess: () => {
      toast.success('Item placed!');
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId) => {
      await base44.entities.UserGardenItem.update(itemId, {
        is_placed: false
      });
    },
    onMutate: async (itemId) => {
      // Optimistically update the UI
      queryClient.setQueryData(['user-garden-items', user.email], (old = []) => 
        old.map(item => 
          item.id === itemId 
            ? { ...item, is_placed: false }
            : item
        )
      );
    },
    onSuccess: () => {
      toast.success('Item removed');
    }
  });

  const inventory = userItems.filter(item => !item.is_placed && !item.is_active_theme);
  const placedItems = userItems.filter(item => item.is_placed);

  const handleCanvasClick = (e) => {
    if (!selectedItem) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    placeMutation.mutate({ 
      itemId: selectedItem.id, 
      x, 
      y,
      emoji: selectedItem.decoration_emoji,
      name: selectedItem.decoration_name
    });
    setSelectedItem(null);
  };
  
  const deleteMutation = useMutation({
    mutationFn: async (itemId) => {
      await base44.entities.UserGardenItem.delete(itemId);
    },
    onMutate: async (itemId) => {
      // Optimistically update the UI
      queryClient.setQueryData(['user-garden-items', user.email], (old = []) => 
        old.filter(item => item.id !== itemId)
      );
    },
    onSuccess: () => {
      toast.success('Item deleted');
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Customize Garden
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Inventory */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Inventory</h3>
            <div className="flex gap-2 flex-wrap p-3 bg-gray-50 rounded-lg min-h-[60px]">
              {inventory.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                  className={`p-2 rounded-lg border-2 transition-all ${
                    selectedItem?.id === item.id 
                      ? 'border-violet-500 bg-violet-50 scale-110' 
                      : 'border-gray-300 bg-white hover:border-violet-300'
                  }`}
                >
                  <span className="text-2xl">{item.decoration_emoji}</span>
                </button>
              ))}
              {inventory.length === 0 && (
                <p className="text-sm text-gray-500 m-auto">No items in inventory</p>
              )}
            </div>
            {selectedItem && (
              <p className="text-xs text-violet-600 mt-2">
                Click on the garden preview to place {selectedItem.decoration_name}
              </p>
            )}
          </div>

          {/* Garden Preview */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Garden Preview</h3>
            <div 
              onClick={handleCanvasClick}
              className="relative h-80 rounded-xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 overflow-hidden border-2 border-gray-200 cursor-crosshair"
            >
              <AnimatePresence>
                {placedItems.map(item => (
                    <motion.div
                      key={item.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute group"
                      style={{ 
                        left: `${item.position_x}%`, 
                        top: `${item.position_y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        longPressTimers.current[item.id] = setTimeout(() => {
                          if (window.confirm(`Delete ${item.decoration_name}?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }, 500);
                      }}
                      onMouseUp={(e) => {
                        e.stopPropagation();
                        if (longPressTimers.current[item.id]) {
                          clearTimeout(longPressTimers.current[item.id]);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (longPressTimers.current[item.id]) {
                          clearTimeout(longPressTimers.current[item.id]);
                        }
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        longPressTimers.current[item.id] = setTimeout(() => {
                          if (window.confirm(`Delete ${item.decoration_name}?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }, 500);
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        if (longPressTimers.current[item.id]) {
                          clearTimeout(longPressTimers.current[item.id]);
                        }
                      }}
                    >
                      <div className="relative">
                        <span className="text-2xl">{item.decoration_emoji}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMutation.mutate(item.id);
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title="Remove from garden"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete ${item.decoration_name} permanently?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          className="absolute -bottom-2 -right-2 w-5 h-5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
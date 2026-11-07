import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSound } from '@/components/audio/useSound';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeftRight, Loader2, Check, X, Send, Inbox, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import RarityBadge from '@/components/characters/RarityBadge';
import TradeCharacterDetail from '@/components/trade/TradeCharacterDetail';

export default function Trade() {
  const [user, setUser] = useState(null);
  const [showNewTrade, setShowNewTrade] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [myCharacterId, setMyCharacterId] = useState('');
  const [theirCharacterId, setTheirCharacterId] = useState('');
  const [tradeMode, setTradeMode] = useState('character'); // 'character' or 'stamps'
  const [stampAmount, setStampAmount] = useState('');
  const [respondingTradeId, setRespondingTradeId] = useState(null);
  const queryClient = useQueryClient();
  const { play: playSound } = useSound();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: allTrades = [] } = useQuery({
    queryKey: ['allPendingTrades'],
    queryFn: () => base44.entities.TradeOffer.filter({ status: 'pending' }),
  });

  const { data: myCharacters = [] } = useQuery({
    queryKey: ['myCharsForTrade', user?.email],
    queryFn: () => base44.entities.Character.filter({ owner_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: allCharacters = [] } = useQuery({
    queryKey: ['allCharsForTrade'],
    queryFn: () => base44.entities.Character.filter({ status: 'home' }),
  });

  // Filter out characters that are in pending trades
  const charactersInTrades = new Set([
    ...allTrades.map(t => t.offered_flikkable_id),
    ...allTrades.map(t => t.requested_flikkable_id).filter(id => !id?.startsWith('stamps_'))
  ]);

  const availableMyCharacters = myCharacters.filter(c => !charactersInTrades.has(c.id));
  const availableOtherCharacters = allCharacters.filter(c => !charactersInTrades.has(c.id) && c.owner_email !== user?.email);

  const { data: incomingTrades = [], isLoading: loadingIncoming } = useQuery({
    queryKey: ['incomingTrades', user?.email],
    queryFn: () => base44.entities.TradeOffer.filter({ to_user_email: user?.email, status: 'pending' }),
    enabled: !!user?.email,
  });

  const { data: outgoingTrades = [], isLoading: loadingOutgoing } = useQuery({
    queryKey: ['outgoingTrades', user?.email],
    queryFn: () => base44.entities.TradeOffer.filter({ from_user_email: user?.email, status: 'pending' }),
    enabled: !!user?.email,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['searchUsersForTrade', userSearchQuery, user?.email],
    queryFn: async () => {
      if (!userSearchQuery || !user?.email) return [];
      const response = await base44.functions.invoke('searchUsersByDisplayName', {
        userEmail: user.email,
        searchQuery: userSearchQuery
      });
      return response.data?.users || [];
    },
    enabled: !!userSearchQuery && !!user?.email,
  });

  const filteredOwners = searchResults.map(u => ({ email: u.email, name: u.display_name }));

  const createTradeMutation = useMutation({
    mutationFn: async () => {
      const myChar = availableMyCharacters.find(c => c.id === myCharacterId);
      
      if (tradeMode === 'character') {
        const theirChar = availableOtherCharacters.find(c => c.id === theirCharacterId);
        
        await base44.entities.TradeOffer.create({
          from_user_email: user.email,
          from_user_name: user.full_name,
          to_user_email: theirChar.owner_email,
          to_user_name: theirChar.owner_name,
          offered_flikkable_id: myChar.id,
          offered_flikkable_name: myChar.name,
          offered_flikkable_emoji: myChar.avatar_emoji,
          offered_flikkable_avatar_url: myChar.avatar_url,
          offered_flikkable_rarity: myChar.rarity,
          requested_flikkable_id: theirChar.id,
          requested_flikkable_name: theirChar.name,
          requested_flikkable_emoji: theirChar.avatar_emoji,
          requested_flikkable_avatar_url: theirChar.avatar_url,
          requested_flikkable_rarity: theirChar.rarity,
          status: 'pending',
        });
      } else {
        // Stamp-based trade
        const recipientUser = uniqueOwners.find(u => u.email === selectedOwner);
        await base44.entities.TradeOffer.create({
          from_user_email: user.email,
          from_user_name: user.full_name,
          to_user_email: selectedOwner,
          to_user_name: recipientUser?.name || '',
          offered_flikkable_id: myChar.id,
          offered_flikkable_name: myChar.name,
          offered_flikkable_emoji: myChar.avatar_emoji,
          offered_flikkable_avatar_url: myChar.avatar_url,
          offered_flikkable_rarity: myChar.rarity,
          requested_flikkable_id: `stamps_${stampAmount}`,
          requested_flikkable_name: `${stampAmount} Stamps`,
          requested_flikkable_emoji: '🛂',
          requested_flikkable_rarity: 'common',
          stamp_request_amount: parseInt(stampAmount),
          status: 'pending',
        });
      }

      // Create notification for incoming trade
       const recipientUser = uniqueOwners.find(u => u.email === selectedOwner);
       await base44.entities.Notification.create({
         user_email: selectedOwner,
         type: 'trade_received',
         title: `${user.display_name || user.full_name} sent a trade offer!`,
         message: `${user.display_name || user.full_name} wants to trade ${myChar.name} for ${tradeMode === 'character' ? myCharacters.find(c => c.id === theirCharacterId)?.name : `${stampAmount} stamps`}.`,
         related_user_email: user.email,
         related_user_name: user.display_name || user.full_name,
        metadata: JSON.stringify({
          offered_character: myChar.name,
          requested_character: tradeMode === 'character' ? myCharacters.find(c => c.id === theirCharacterId)?.name : `${stampAmount} Stamps`,
          offerer: user.full_name
        }),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    },
    onSuccess: () => {
       playSound('success');
       queryClient.invalidateQueries({ queryKey: ['outgoingTrades'] });
       queryClient.invalidateQueries({ queryKey: ['allPendingTrades'] });
       queryClient.invalidateQueries({ queryKey: ['notifications'] });
       setShowNewTrade(false);
       setMyCharacterId('');
       setTheirCharacterId('');
       setSelectedOwner(null);
       setUserSearchQuery('');
       setStampAmount('');
       setTradeMode('character');
    },
  });

  const respondTradeMutation = useMutation({
    mutationFn: async ({ trade, accept }) => {
      if (accept) {
         const isStampTrade = trade.requested_flikkable_id?.startsWith('stamps_');

         if (isStampTrade) {
           // Stamp trade: move character to recipient and handle stamp transfer
           const offeredChar = await base44.entities.Character.filter({ id: trade.offered_flikkable_id });
           if (offeredChar[0]) {
             // Extract stamp amount from trade.requested_flikkable_id (format: "stamps_100")
             const stampsToTransfer = parseInt(trade.requested_flikkable_id.split('_')[1]) || 0;

             // Check if user has enough stamps
             const acceptorUser = await base44.auth.me();
             const currentStamps = acceptorUser.passport_stamps || 0;

             if (currentStamps < stampsToTransfer) {
               throw new Error(`You need ${stampsToTransfer} stamps but only have ${currentStamps}. Trade cannot be completed.`);
             }

             await base44.entities.Character.update(trade.offered_flikkable_id, {
               owner_email: trade.to_user_email,
               owner_name: trade.to_user_name,
             });

             // Deduct stamps from acceptor (buyer)
             const newStamps = currentStamps - stampsToTransfer;
             await base44.auth.updateMe({
               passport_stamps: newStamps
             });

             // Credit stamps to offerer (seller)
             const offererUser = await base44.entities.User.list();
             const offererData = offererUser.find(u => u.email === trade.from_user_email);
             if (offererData) {
               const offererNewStamps = (offererData.passport_stamps || 0) + stampsToTransfer;
               await base44.entities.User.update(offererData.id, {
                 passport_stamps: offererNewStamps
               });
             }

             // Create transactions to track stamp transfer
             await base44.entities.StampTransaction.create({
               user_email: trade.to_user_email,
               user_name: trade.to_user_name,
               transaction_type: 'trade_sent',
               stamps: stampsToTransfer,
               character_id: trade.offered_flikkable_id,
               character_name: trade.offered_flikkable_name,
               related_user_email: trade.from_user_email,
               related_user_name: trade.from_user_name,
               processed: true
             });

             await base44.entities.StampTransaction.create({
               user_email: trade.from_user_email,
               user_name: trade.from_user_name,
               transaction_type: 'trade_received',
               stamps: stampsToTransfer,
               character_id: trade.offered_flikkable_id,
               character_name: trade.offered_flikkable_name,
               related_user_email: trade.to_user_email,
               related_user_name: trade.to_user_name,
               processed: true
             });
           }
         } else {
          // Character-for-character trade
          const offeredChar = await base44.entities.Character.filter({ id: trade.offered_flikkable_id });
          const requestedChar = await base44.entities.Character.filter({ id: trade.requested_flikkable_id });
          
          if (offeredChar[0] && requestedChar[0]) {
            await base44.entities.Character.update(trade.offered_flikkable_id, {
              owner_email: trade.to_user_email,
              owner_name: trade.to_user_name,
            });
            await base44.entities.Character.update(trade.requested_flikkable_id, {
              owner_email: trade.from_user_email,
              owner_name: trade.from_user_name,
            });
          }
        }
      }
      // Create notification
      if (accept) {
        // Accepted trade notification to offerer
        await base44.entities.Notification.create({
          user_email: trade.from_user_email,
          type: 'trade_accepted',
          title: `${trade.to_user_name} accepted the trade!`,
          message: `${trade.offered_flikkable_name} is on its way in exchange for ${trade.requested_flikkable_name}.`,
          related_user_email: trade.to_user_email,
          related_user_name: trade.to_user_name,
          metadata: JSON.stringify({
            offered_character: trade.offered_flikkable_name,
            requested_character: trade.requested_flikkable_name,
            recipient: trade.to_user_name
          }),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      } else {
        // Declined trade notification to offerer
        await base44.entities.Notification.create({
          user_email: trade.from_user_email,
          type: 'trade_declined',
          title: `${trade.to_user_name} declined the trade`,
          message: `The trade offer for ${trade.requested_flikkable_name} was declined.`,
          related_user_email: trade.to_user_email,
          related_user_name: trade.to_user_name,
          metadata: JSON.stringify({
            offered_character: trade.offered_flikkable_name,
            requested_character: trade.requested_flikkable_name
          }),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      await base44.entities.TradeOffer.update(trade.id, { status: accept ? 'accepted' : 'declined' });
      },
      onSuccess: () => {
      playSound(accept ? 'success' : 'notification');
      setRespondingTradeId(null);
      queryClient.invalidateQueries({ queryKey: ['incomingTrades'] });
      queryClient.invalidateQueries({ queryKey: ['allPendingTrades'] });
      queryClient.invalidateQueries({ queryKey: ['myCharsForTrade'] });
      queryClient.invalidateQueries({ queryKey: ['allCharsForTrade'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
      onError: (error) => {
      console.error('Trade response failed:', error);
      toast.error('Trade failed: ' + (error.message || 'Unknown error'));
      setRespondingTradeId(null);
      },
      });

  const cancelTradeMutation = useMutation({
    mutationFn: (trade) => base44.entities.TradeOffer.update(trade.id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outgoingTrades'] });
      queryClient.invalidateQueries({ queryKey: ['allPendingTrades'] });
    },
  });

  const ownerChars = availableOtherCharacters.filter(c => c.owner_email === selectedOwner);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-purple-50">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-6 mt-12">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trade</h1>
            <p className="text-sm text-gray-500">Swap Flikkables with others</p>
          </div>
          <Button 
          onClick={() => setShowNewTrade(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-500"
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            New Trade
          </Button>
        </div>

        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="w-full bg-white/50 border p-1 rounded-xl mb-4">
            <TabsTrigger value="incoming" className="flex-1 rounded-lg">
              <Inbox className="w-4 h-4 mr-2" />
              Incoming ({incomingTrades.length})
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="flex-1 rounded-lg">
              <Send className="w-4 h-4 mr-2" />
              Outgoing ({outgoingTrades.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="space-y-3">
            {loadingIncoming ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : incomingTrades.length === 0 ? (
              <Card className="p-8 text-center bg-white/80 border-0 shadow-lg">
                <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">No incoming trade offers</p>
              </Card>
            ) : (
              <AnimatePresence>
                {incomingTrades.map((trade) => (
                  <TradeCard 
                    key={trade.id} 
                    trade={trade} 
                    type="incoming"
                    onAccept={() => {
                      setRespondingTradeId(trade.id);
                      respondTradeMutation.mutate({ trade, accept: true });
                    }}
                    onDecline={() => {
                      setRespondingTradeId(trade.id);
                      respondTradeMutation.mutate({ trade, accept: false });
                    }}
                    acceptLoading={respondingTradeId === trade.id && respondTradeMutation.isPending}
                    declineLoading={respondingTradeId === trade.id && respondTradeMutation.isPending}
                  />
                ))}
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="space-y-3">
            {loadingOutgoing ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : outgoingTrades.length === 0 ? (
              <Card className="p-8 text-center bg-white/80 border-0 shadow-lg">
                <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm text-gray-500">No outgoing trade offers</p>
              </Card>
            ) : (
              <AnimatePresence>
                {outgoingTrades.map((trade) => (
                  <TradeCard 
                    key={trade.id} 
                    trade={trade} 
                    type="outgoing"
                    onCancel={() => {
                      if (!cancelTradeMutation.isPending) {
                        cancelTradeMutation.mutate(trade);
                      }
                    }}
                    cancelLoading={cancelTradeMutation.isPending}
                  />
                ))}
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* New Trade Modal */}
      <Dialog open={showNewTrade} onOpenChange={setShowNewTrade}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Create Trade Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="flex gap-2">
              <button
                onClick={() => setTradeMode('character')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                  tradeMode === 'character' 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                For Character
              </button>
              <button
                onClick={() => setTradeMode('stamps')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                  tradeMode === 'stamps' 
                    ? 'bg-indigo-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                For Stamps
              </button>
            </div>

            <div>
               <label className="text-xs font-medium text-gray-700 mb-1 block">Your Flikkable</label>
               <Select value={myCharacterId} onValueChange={setMyCharacterId}>
                 <SelectTrigger className="h-9 text-sm">
                   <SelectValue placeholder="Select your Flikkable" />
                 </SelectTrigger>
                 <SelectContent>
                  {availableMyCharacters.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-1.5">
                        <span className="text-base">{c.avatar_url ? '🖼️' : c.avatar_emoji}</span> 
                        <span className="text-xs">{c.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                 </SelectContent>
               </Select>
             </div>

            <div className="flex justify-center py-1">
              <ArrowLeftRight className="w-4 h-4 text-gray-400" />
            </div>

            {tradeMode === 'character' ? (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Trade With (Search)</label>
                  <Input
                    type="text"
                    placeholder="Type player name..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="h-9 text-sm"
                  />
                  {userSearchQuery && filteredOwners.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto bg-white border rounded-lg">
                      {filteredOwners.slice(0, 5).map(o => (
                        <button
                          key={o.email}
                          onClick={() => {
                            setSelectedOwner(o.email);
                            setUserSearchQuery(o.name);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
                        >
                          {o.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedOwner && (
                   <div>
                     <label className="text-xs font-medium text-gray-700 mb-1 block">Their Flikkable</label>
                     <Select value={theirCharacterId} onValueChange={setTheirCharacterId}>
                       <SelectTrigger className="h-9 text-sm">
                         <SelectValue placeholder="Select their Flikkable" />
                       </SelectTrigger>
                       <SelectContent>
                         {ownerChars.map(c => (
                           <SelectItem key={c.id} value={c.id}>
                             <span className="flex items-center gap-1.5">
                               <span className="text-base">{c.avatar_url ? '🖼️' : c.avatar_emoji}</span> 
                               <span className="text-xs">{c.name}</span>
                             </span>
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Send To (Search)</label>
                  <Input
                    type="text"
                    placeholder="Type player name..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="h-9 text-sm"
                  />
                  {userSearchQuery && filteredOwners.length > 0 && (
                    <div className="mt-1 max-h-32 overflow-y-auto bg-white border rounded-lg">
                      {filteredOwners.slice(0, 5).map(o => (
                        <button
                          key={o.email}
                          onClick={() => {
                            setSelectedOwner(o.email);
                            setUserSearchQuery(o.name);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
                        >
                          {o.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Stamps Required</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={stampAmount}
                    onChange={(e) => setStampAmount(e.target.value)}
                    placeholder="Enter stamps"
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}

            <Button 
              className="w-full h-9 bg-gradient-to-r from-indigo-500 to-purple-500 text-sm"
              disabled={
                !myCharacterId || 
                (tradeMode === 'character' ? !theirCharacterId : !stampAmount || !selectedOwner) ||
                createTradeMutation.isPending
              }
              onClick={() => createTradeMutation.mutate()}
            >
              {createTradeMutation.isPending ? 'Sending...' : 'Send Offer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TradeCard({ trade, type, onAccept, onDecline, onCancel, acceptLoading, declineLoading, cancelLoading }) {
   const isStampTrade = trade.requested_flikkable_id?.startsWith('stamps_');
   const [expandedChar, setExpandedChar] = React.useState(null);
   const [user, setUser] = React.useState(null);
   const [insufficientStamps, setInsufficientStamps] = React.useState(false);

   React.useEffect(() => {
     base44.auth.me().then(u => {
       setUser(u);
       if (isStampTrade && type === 'incoming') {
         const stampsNeeded = parseInt(trade.requested_flikkable_id.split('_')[1]) || 0;
         setInsufficientStamps((u.passport_stamps || 0) < stampsNeeded);
       }
     });
   }, [isStampTrade, trade, type]);

   return (
     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
       <Card className="p-4 bg-white/80 border-0 shadow-lg">
         <div className="flex items-center justify-between mb-3">
           <span className="text-xs text-gray-500 flex items-center gap-1">
             <Clock className="w-3 h-3" />
             {type === 'incoming' ? `From ${trade.from_user_name}` : `To ${trade.to_user_name}`}
           </span>
           {isStampTrade && (
             <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
               Stamp Trade ({parseInt(trade.requested_flikkable_id.split('_')[1]) || 0} needed)
             </span>
           )}
         </div>
        
        <div className="flex items-center gap-3 mb-3">
          <div 
            className="flex-1 text-center p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setExpandedChar(expandedChar === 'offered' ? null : 'offered')}
          >
            <div className="w-16 h-16 mx-auto mb-1 rounded-xl overflow-hidden bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
              {trade.offered_flikkable_avatar_url ? (
                <img src={trade.offered_flikkable_avatar_url} alt={trade.offered_flikkable_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{trade.offered_flikkable_emoji}</span>
              )}
            </div>
            <p className="text-sm font-medium truncate">{trade.offered_flikkable_name}</p>
            <RarityBadge rarity={trade.offered_flikkable_rarity} />
          </div>
          
          <ArrowLeftRight className="w-5 h-5 text-gray-400 shrink-0" />
          
          <div 
            className="flex-1 text-center p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setExpandedChar(expandedChar === 'requested' ? null : 'requested')}
          >
            <div className="w-16 h-16 mx-auto mb-1 rounded-xl overflow-hidden bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
              {trade.requested_flikkable_avatar_url ? (
                <img src={trade.requested_flikkable_avatar_url} alt={trade.requested_flikkable_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">{trade.requested_flikkable_emoji}</span>
              )}
            </div>
            <p className="text-sm font-medium truncate">{trade.requested_flikkable_name}</p>
            {!isStampTrade && <RarityBadge rarity={trade.requested_flikkable_rarity} />}
          </div>
        </div>

        {expandedChar && (
          <Card className="p-3 mb-3 bg-violet-50 border-violet-200">
            <p className="text-xs text-gray-600 mb-2 font-medium">
              {expandedChar === 'offered' ? trade.offered_flikkable_name : trade.requested_flikkable_name}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded p-2 border border-violet-100">
                <p className="text-gray-600 mb-1 font-medium">Distance</p>
                <p className="font-semibold text-gray-900">{trade[expandedChar === 'offered' ? 'offered_flikkable_distance' : 'requested_flikkable_distance'] || 'N/A'} km</p>
              </div>
              <div className="bg-white rounded p-2 border border-violet-100">
                <p className="text-gray-600 mb-1 font-medium">Cities</p>
                <p className="font-semibold text-gray-900">{trade[expandedChar === 'offered' ? 'offered_flikkable_cities' : 'requested_flikkable_cities'] || 'N/A'}</p>
              </div>
            </div>
          </Card>
        )}

        {insufficientStamps && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">
              You need {parseInt(trade.requested_flikkable_id.split('_')[1]) || 0} stamps but only have {user?.passport_stamps || 0}
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {type === 'incoming' ? (
            <>
              <Button 
                className="flex-1 bg-emerald-500 hover:bg-emerald-600" 
                onClick={onAccept} 
                disabled={acceptLoading || insufficientStamps}
              >
                {acceptLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                {acceptLoading ? 'Accepting...' : 'Accept'}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={onDecline}
                disabled={declineLoading}
              >
                {declineLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <X className="w-4 h-4 mr-1" />}
                {declineLoading ? 'Declining...' : 'Decline'}
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onCancel}
              disabled={cancelLoading}
            >
              {cancelLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              {cancelLoading ? 'Canceling...' : 'Cancel Offer'}
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
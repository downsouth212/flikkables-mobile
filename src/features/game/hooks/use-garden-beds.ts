import { useToast } from 'heroui-native';
import { useEffect, useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { useGameStore } from '@/features/game/store/game-store';
import type { GardenPlant } from '@/features/game/types/garden';
import { gameApi } from '@/features/game/utils/game-api';

function message(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

/** The garden's six flower beds: plant a seed, wait a real day, pick the bloom for stamps. */
export function useGardenBeds() {
  const { toast } = useToast();
  const [plants, setPlants] = useState<GardenPlant[]>([]);
  const [beds, setBeds] = useState(6);
  const [pickStamps, setPickStamps] = useState(3);

  useEffect(() => {
    let live = true;
    gameApi
      .plants()
      .then((r) => {
        if (!live) return;
        setPlants(r.plants);
        setBeds(r.beds);
        setPickStamps(r.pick_stamps);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const plant = async (bed: number) => {
    try {
      const { plant: p } = await gameApi.plant(bed);
      setPlants((all) => [...all.filter((x) => x.bed !== bed), p]);
      Presets.System.notificationSuccess();
      toast.show({ label: 'Seed planted. It blooms in a day.', variant: 'success' });
    } catch (err) {
      Presets.System.notificationError();
      toast.show({ label: message(err), variant: 'danger' });
    }
  };

  const pick = async (bed: number) => {
    try {
      const r = await gameApi.pick(bed);
      setPlants((all) => all.filter((x) => x.bed !== bed));
      useGameStore.getState().addStamps(r.stamps_awarded);
      Presets.System.notificationSuccess();
      toast.show({ label: `${r.flower} Picked! +${r.stamps_awarded} stamps`, variant: 'success' });
    } catch (err) {
      Presets.System.notificationError();
      toast.show({ label: message(err), variant: 'danger' });
    }
  };

  const growing = (p: GardenPlant) => {
    const hours = Math.ceil((new Date(p.ready_at).getTime() - Date.now()) / 3600000);
    toast.show({ label: hours > 1 ? `Blooms in ${hours} h` : 'Blooms within the hour' });
  };

  return { plants, beds, pickStamps, plant, pick, growing };
}

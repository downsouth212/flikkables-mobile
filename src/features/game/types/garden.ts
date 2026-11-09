export interface GardenPlant {
  bed: number;
  flower: string;
  planted_at: string;
  ready_at: string;
}

export interface GardenPlants {
  plants: GardenPlant[];
  beds: number;
  grow_hours: number;
  pick_stamps: number;
}

export interface PickResult {
  stamps_awarded: number;
  stamps: number | null;
  flower: string;
}

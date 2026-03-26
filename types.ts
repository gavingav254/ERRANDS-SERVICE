
export type CampusZone = 'Academic' | 'Hostels' | 'Admin' | 'Gate' | 'Mess' | 'Unknown';
export type TransportMode = 'Walking' | 'Bike' | 'PSV';

export interface Coords {
  lat: number;
  lng: number;
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface Errand {
  id: string;
  studentName: string;
  requestText: string;
  item: string;
  source: string;
  location: string;
  pickupPoint?: string;
  zone: CampusZone;
  price: number;
  status: 'Pending' | 'Active' | 'Completed';
  timestamp: number;
  isInternal: boolean;
  notes?: string;
  runnerCoords?: Coords;
  runnerSpeed?: number; // Speed in m/s
  runnerAccuracy?: number; // Accuracy in meters
  transportMode?: TransportMode;
  destinationCoords?: Coords;
  eta?: string;
  groundingLinks?: GroundingLink[];
}

export interface AIResponse {
  item: string;
  source: string;
  location: string;
  zone: CampusZone;
  isInternal: boolean;
  isCrossCampus: boolean;
  notes?: string;
  approxDestinationCoords?: Coords;
  groundingLinks?: GroundingLink[];
}

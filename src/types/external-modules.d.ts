declare module "react-native-maps" {
  import type { Component, ReactNode } from "react";
  import type { ViewProps } from "react-native";

  export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface MapViewProps extends ViewProps {
    region?: Region;
    initialRegion?: Region;
    onRegionChangeComplete?(region: Region): void;
  }

  export default class MapView extends Component<MapViewProps> {}

  export interface MarkerProps {
    coordinate: {
      latitude: number;
      longitude: number;
    };
    anchor?: {
      x: number;
      y: number;
    };
    children?: ReactNode;
  }

  export class Marker extends Component<MarkerProps> {}

  export interface CircleProps {
    center: {
      latitude: number;
      longitude: number;
    };
    radius: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
  }

  export class Circle extends Component<CircleProps> {}
}

declare module "expo-location" {
  export enum PermissionStatus {
    UNDETERMINED = "undetermined",
    GRANTED = "granted",
    DENIED = "denied",
  }

  export interface PermissionResponse {
    status: PermissionStatus;
  }

  export interface LocationObjectCoords {
    latitude: number;
    longitude: number;
  }

  export interface LocationObject {
    coords: LocationObjectCoords;
  }

  export interface LocationOptions {
    accuracy?: Accuracy;
    timeout?: number;
    maximumAge?: number;
    mayAllowReducedAccuracy?: boolean;
  }

  export interface LocationLastKnownOptions {
    maxAge?: number;
    requiredAccuracy?: number;
  }

  export enum Accuracy {
    Lowest = 1,
    Low = 2,
    Balanced = 3,
    High = 4,
    Highest = 5,
    BestForNavigation = 6,
  }

  export interface ReverseGeocodeAddress {
    name?: string;
    street?: string;
    city?: string;
    subregion?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    isoCountryCode?: string;
  }

  export function requestForegroundPermissionsAsync(): Promise<PermissionResponse>;
  export function getCurrentPositionAsync(
    options?: LocationOptions
  ): Promise<LocationObject>;
  export function getLastKnownPositionAsync(
    options?: LocationLastKnownOptions
  ): Promise<LocationObject | null>;
  export function hasServicesEnabledAsync(): Promise<boolean>;
  export function reverseGeocodeAsync(
    location: LocationObjectCoords,
    options?: { useGoogleMaps?: boolean; timeout?: number }
  ): Promise<ReverseGeocodeAddress[]>;
  export function getProviderStatusAsync(): Promise<{
    locationServicesEnabled: boolean;
    gpsAvailable?: boolean;
    networkAvailable?: boolean;
    passiveAvailable?: boolean;
  }>;
}


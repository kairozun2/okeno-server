import React from "react";
import MapView, { Marker } from "react-native-maps";

interface NativeMapViewProps {
  lat: number;
  lng: number;
  name: string;
  isDark: boolean;
}

export default function NativeMapView({ lat, lng, name, isDark }: NativeMapViewProps) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      userInterfaceStyle={isDark ? "dark" : "light"}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} title={name} />
    </MapView>
  );
}

"use client";

import { useCallback, useState } from "react";
import type { Vehicle } from "@/types/vehicle";
import { CarConfigurator } from "./CarConfigurator";
import { VehicleSwitcher } from "./VehicleSwitcher";

interface VehicleShowroomProps {
  vehicles: Vehicle[];
  initialVehicleId: string;
}

/**
 * Switches the configurator between vehicles. Each car gets a fresh
 * configurator (keyed by id), so colours, camera and panels never leak from
 * one car to the next. The choice is mirrored in `?car=` for shareable links.
 */
export function VehicleShowroom({ vehicles, initialVehicleId }: VehicleShowroomProps) {
  const [vehicleId, setVehicleId] = useState(initialVehicleId);
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? vehicles[0];

  const selectVehicle = useCallback((id: string) => {
    setVehicleId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("car", id);
    // Updates the address bar without a navigation or a server round-trip.
    window.history.replaceState(null, "", url);
  }, []);

  return (
    <CarConfigurator
      key={vehicle.id}
      vehicle={vehicle}
      vehicleSwitcher={<VehicleSwitcher vehicles={vehicles} activeId={vehicle.id} onSelect={selectVehicle} />}
    />
  );
}

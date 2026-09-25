import type { Vehicle } from "@/types/vehicle";
import { demoVehicle } from "./demo-car";
import { protonSaga } from "./proton-saga";

/**
 * Every vehicle the showroom can switch between, in switcher order. The first
 * is shown by default. Adding a car = adding its data file here.
 */
export const vehicles: Vehicle[] = [protonSaga, demoVehicle];

export function findVehicle(id: string | undefined): Vehicle {
  return vehicles.find((vehicle) => vehicle.id === id) ?? vehicles[0];
}

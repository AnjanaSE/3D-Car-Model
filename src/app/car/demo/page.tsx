import type { Metadata } from "next";
import { preload } from "react-dom";
import { findVehicle, vehicles } from "@/data/vehicles";
import { VehicleShowroom } from "@/components/configurator/VehicleShowroom";

export const metadata: Metadata = {
  title: "Vehicle Configurator",
  description: `Explore ${vehicles.map((v) => v.name).join(" and ")} in 3D.`,
};

export default async function CarDemoPage({ searchParams }: PageProps<"/car/demo">) {
  const { car } = await searchParams;
  const vehicle = findVehicle(typeof car === "string" ? car : undefined);

  // Start downloading the chosen car's GLB alongside the viewer's JS chunk.
  preload(vehicle.model.url, { as: "fetch", crossOrigin: "anonymous" });

  return (
    <main>
      <VehicleShowroom vehicles={vehicles} initialVehicleId={vehicle.id} />
    </main>
  );
}

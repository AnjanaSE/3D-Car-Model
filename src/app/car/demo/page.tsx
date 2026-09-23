import type { Metadata } from "next";
import { preload } from "react-dom";
import { demoVehicle } from "@/data/demo-car";
import { CarConfigurator } from "@/components/configurator/CarConfigurator";

export const metadata: Metadata = {
  title: `${demoVehicle.name} · Configurator`,
  description: `Explore the ${demoVehicle.name} in 3D. ${demoVehicle.subtitle}, starting from ${demoVehicle.startingPrice}.`,
};

export default function CarDemoPage() {
  // Start downloading the GLB alongside the viewer's JS chunk instead of after it.
  preload(demoVehicle.model.url, { as: "fetch", crossOrigin: "anonymous" });

  return (
    <main>
      <CarConfigurator vehicle={demoVehicle} />
    </main>
  );
}

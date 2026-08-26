import { JarvisDashboard } from "@/components/hud/JarvisDashboard";
import { loadOnda2Summary } from "@/lib/campaign/onda2.server";

/**
 * Server Component: lê o ONDA2_app.html no build e entrega ao HUD os números
 * que o módulo MARKETING mostra antes mesmo de hidratar.
 */
export default async function Page() {
  const onda2 = await loadOnda2Summary();
  return <JarvisDashboard onda2={onda2} />;
}

import ExpertDirectory from "@/components/expert-directory";
import { experts } from "@/lib/expert-data";
export default function Home() {
  return <ExpertDirectory experts={experts} token={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ""} />;
}

// Design preview / rehearsal: the guided public tour rendered with the frozen featured
// run and real HashScan links — no API key, no operator cookie needed. This is the same
// experience the public read-only deploy serves at "/".
import GuidedTour from "../console/GuidedTour";

export default function PreviewPage() {
  return <GuidedTour />;
}

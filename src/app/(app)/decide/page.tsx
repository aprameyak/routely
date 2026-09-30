import { Suspense } from "react";
import DecideClient from "./DecideClient";
export default function DecidePage() {
    return (<Suspense fallback={<div className="mx-auto max-w-2xl p-6 text-sm text-muted">Loading Routely…</div>}>
      <DecideClient />
    </Suspense>);
}

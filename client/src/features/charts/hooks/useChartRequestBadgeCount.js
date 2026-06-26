import { useEffect, useState } from "react";
import { subscribeToChartRequests } from "@features/charts/services/chartService";
import { useAuth } from "@features/auth/context/useAuth";

// Counts the chart requests that currently need the signed-in user's attention so
// the sidebar can surface a badge: Medical Records sees newly submitted requests
// waiting to be prepared, while clinical users see their own requests that Records
// has marked ready for pickup. The underlying subscription already scopes clinical
// users to their own requests.
export function useChartRequestBadgeCount() {
  const { currentUser, userProfile, isMedicalRecordsUser } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid || !userProfile?.role) {
      let isActive = true;
      // Defer so the reset doesn't run synchronously inside the effect body.
      queueMicrotask(() => { if (isActive) setCount(0); });
      return () => { isActive = false; };
    }

    const unsubscribe = subscribeToChartRequests(
      (rows) => {
        const actionable = rows.filter((row) => (
          isMedicalRecordsUser
            ? row.status === "pending"
            : row.status === "ready" && row.requestedById === currentUser.uid
        ));
        setCount(actionable.length);
      },
      () => setCount(0),
    );

    return () => unsubscribe();
  }, [currentUser?.uid, userProfile?.role, isMedicalRecordsUser]);

  return count;
}

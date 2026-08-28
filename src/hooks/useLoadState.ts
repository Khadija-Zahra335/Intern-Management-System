"use client";

import { useState } from "react";

export function useLoadState(startsLoading = true) {
  const [loading, setLoading] = useState(startsLoading);
  const [refreshing, setRefreshing] = useState(false);

  function startLoad(initial: boolean) {
    if (initial) setLoading(true);
    else setRefreshing(true);
  }

  function endLoad(initial: boolean) {
    if (initial) setLoading(false);
    else setRefreshing(false);
  }

  return { loading, refreshing, startLoad, endLoad };
}
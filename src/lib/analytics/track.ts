type DataLayerEvent = {
  event: string;
  [key: string]: string | number | boolean | null | undefined;
};

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
  }
}

export function track(event: string, payload: Omit<DataLayerEvent, "event"> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

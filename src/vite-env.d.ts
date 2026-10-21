/// <reference types="vite/client" />

declare module "*.json" {
  const value: {
    features: Array<{
      geometry: { type: string; coordinates: number[] }
      properties: Omit<import("./types").Business, "lon" | "lat">
    }>
  }
  export default value
}

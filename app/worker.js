import { env, pipeline, RawImage } from "@huggingface/transformers";

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "/models/";

let classifier = null;

self.addEventListener("message", async (event) => {
  const { action, rgbaData, width, height } = event.data;

  if (action === "analyze") {
    try {
      if (!classifier) {
        // Pipeline will automatically load config.json if it exists
        classifier = await pipeline("image-classification", "plant_analyzer_model", { quantized: false });
      }

      const pixelData = new Uint8Array(rgbaData.buffer || rgbaData);
      const rawImage = new RawImage(pixelData, width, height, 4).rgb();
      const results = await classifier(rawImage, { topk: 5 });

      // DEBUG: Log the raw results to see what the model provides
      console.log("WORKER: Raw pipeline results:", results);

      const sanitizedResults = results.map((r) => {
        // r.label will be populated automatically if config.json is correct.
        // If r.label is undefined, we return the internal ID or a placeholder.
        return {
          ...r,
          id: r.id || "unknown", // The model usually returns the class ID
          label: r.label || `Node ID: ${r.id}`, 
          score: r.score ?? 0,
          fullObject: r
        };
      });

      self.postMessage({ status: "success", results: sanitizedResults });
    } catch (error) {
      console.error("Worker Error:", error);
      self.postMessage({ status: "error", error: error.message });
    }
  }
});
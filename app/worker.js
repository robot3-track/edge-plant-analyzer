import { env, pipeline, RawImage } from "@huggingface/transformers";

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "/models/";

let classifier = null;

// HARDCODED MAPPING: This ensures the UI will definitely show your names
const LABEL_MAP = {
  0: "Powdery Mildew",
  1: "Healthy",
  2: "Early Blight",
  3: "Late Blight",
  4: "Septoria Leaf Spot"
};

self.addEventListener("message", async (event) => {
  const { action, rgbaData, width, height } = event.data;

  if (action === "analyze") {
    try {
      if (!classifier) {
        self.postMessage({ status: "loading", message: "Initializing pipeline..." });
        classifier = await pipeline("image-classification", "plant_analyzer_model", { quantized: false });
      }

      const pixelData = new Uint8Array(rgbaData.buffer || rgbaData);
      const rawImage = new RawImage(pixelData, width, height, 4).rgb();
      
      const results = await classifier(rawImage, { topk: 5 });

      // MANUALLY MAP THE LABELS:
      // Even if the pipeline doesn't find the label, we look it up using the index
      const sanitizedResults = results.map((r, index) => {
        // Use the pipeline's label if it exists (r.label), otherwise use our map
        const label = r.label || LABEL_MAP[index] || `Node ID: ${index}`;
        
        return {
          ...r,
          id: index,
          label: label,
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
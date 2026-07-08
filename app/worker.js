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
        classifier = await pipeline("image-classification", "plant_analyzer_model", { quantized: false });
      }

      const pixelData = new Uint8Array(rgbaData.buffer || rgbaData);
      const rawImage = new RawImage(pixelData, width, height, 4).rgb();
      const results = await classifier(rawImage, { topk: 5 });

      // SAFETY FIX: Ensure 'label' is always a string before sending to UI
      const sanitizedResults = results.map((r) => ({
        label: r.label ? String(r.label) : "Unmapped Node",
        score: r.score ?? 0
      }));

      self.postMessage({ status: "success", results: sanitizedResults });
    } catch (error) {
      self.postMessage({ status: "error", error: error.message });
    }
  }
});
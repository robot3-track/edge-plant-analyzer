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
        // We explicitly tell it to only look for the image classification pipeline
        // and force the revision to 'main' to avoid secondary file lookups
        classifier = await pipeline("image-classification", "plant_analyzer_model", { 
          quantized: true,
          // This prevents the library from trying to instantiate a tokenizer
          // by explicitly defining the expected processor type
          processor: "ViTImageProcessor" 
        });
      }

      const pixelData = new Uint8Array(rgbaData.buffer || rgbaData);
      const rawImage = new RawImage(pixelData, width, height, 4).rgb();
      
      const results = await classifier(rawImage, { topk: 5 });

      self.postMessage({ status: "success", results: results });

    } catch (error) {
      console.error("Worker Error:", error);
      self.postMessage({ status: "error", error: error.message });
    }
  }
});
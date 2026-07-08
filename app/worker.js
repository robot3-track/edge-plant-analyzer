import { pipeline, env } from "@huggingface/transformers";

env.allowLocalModels = false;

let classifier = null;

self.addEventListener("message", async (event) => {
  const { image } = event.data;

  try {
    if (!classifier) {
      self.postMessage({ status: "loading", message: "Initializing localized plant pathology engine..." });
      
      // Loading a dedicated, edge-optimized Vision Transformer trained on crop diseases
      classifier = await pipeline(
        "image-classification", 
        "onnx-community/crop_leaf_diseases_vit", 
        { device: "webgpu" } 
      );
    }

    self.postMessage({ status: "processing", message: "Analyzing cellular layout & leaf tissue..." });
    
    // Scan frame against custom botanical vectors
    const output = await classifier(image, { top_k: 3 });
    
    self.postMessage({ status: "success", results: output });
  } catch (error) {
    self.postMessage({ status: "error", error: error.message });
  }
});
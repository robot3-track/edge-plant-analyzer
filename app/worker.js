import { pipeline, env } from "@huggingface/transformers";

// Strictly allow local files only for 100% offline usage
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "/models/";

let classifier = null;

self.addEventListener("message", async (event) => {
  const { image } = event.data;

  try {
    if (!classifier) {
      self.postMessage({ status: "loading", message: "Loading local offline plant diagnostic models..." });
      
      classifier = await pipeline(
        "image-classification", // Keep this
        "plant_analyzer_model",
        {
          device: "webgpu",
          revision: "main",
          // ADD THIS LINE: Explicitly tells the pipeline it only needs vision layers
          task: "image-classification" 
        }
      );
    }

    self.postMessage({ status: "processing", message: "Analyzing cell structures..." });
    const output = await classifier(image, { top_k: 3 });
    self.postMessage({ status: "success", results: output });
  } catch (error) {
    self.postMessage({ status: "error", error: `Offline pipeline execution failed: ${error.message}` });
  }
});
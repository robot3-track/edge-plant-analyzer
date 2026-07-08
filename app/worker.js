import { env, AutoProcessor, AutoModelForImageClassification, RawImage } from "@huggingface/transformers";

// Strictly allow local files only for 100% offline usage
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "/models/";

let processor = null;
let model = null;

self.addEventListener("message", async (event) => {
  const { image } = event.data;

  try {
    // 1. Initialize components individually to completely bypass tokenizers
    if (!processor || !model) {
      self.postMessage({ status: "loading", message: "Loading local offline vision engine..." });
      
      processor = await AutoProcessor.from_pretrained("plant_analyzer_model");
      model = await AutoModelForImageClassification.from_pretrained("plant_analyzer_model", {
        device: "webgpu"
      });
    }

    self.postMessage({ status: "processing", message: "Processing image arrays..." });

    // 2. Read the image data and run it through the image preprocessor config
    const rawImage = await RawImage.read(image);
    const inputs = await processor(rawImage);

    self.postMessage({ status: "processing", message: "Analyzing cell structures..." });

    // 3. Run direct inference through the model weights
    const { logits } = await model(inputs);
    
    // 4. Decode the raw outputs manually using your config.json labels
    const scores = logits.data;
    const id2label = model.config.id2label;

    // Sort the outputs to find the top 3 matches
    const results = Object.keys(id2label)
      .map(id => ({
        label: id2label[id],
        score: scores[parseInt(id)] || 0
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    self.postMessage({ status: "success", results: results });
  } catch (error) {
    self.postMessage({ status: "error", error: `Offline pipeline execution failed: ${error.message}` });
  }
});
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
    if (!processor || !model) {
      self.postMessage({ status: "loading", message: "Loading local offline vision engine..." });
      
      processor = await AutoProcessor.from_pretrained("plant_analyzer_model");
      model = await AutoModelForImageClassification.from_pretrained("plant_analyzer_model", {
        device: "webgpu"
      });
    }

    self.postMessage({ status: "processing", message: "Processing image arrays..." });

    const rawImage = await RawImage.read(image);
    const inputs = await processor(rawImage);

    self.postMessage({ status: "processing", message: "Analyzing cell structures..." });

    const { logits } = await model(inputs);
    
    // Apply Softmax to fix outrageous percentage values[cite: 2]
    const maxLogit = Math.max(...logits.data);
    const scores = logits.data.map(l => Math.exp(l - maxLogit));
    const sumScores = scores.reduce((a, b) => a + b, 0);
    const probabilities = scores.map(s => s / sumScores);

    const id2label = model.config.id2label;
    const results = Object.keys(id2label)
      .map(id => ({
        label: id2label[id],
        score: probabilities[parseInt(id)]
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    self.postMessage({ status: "success", results: results });
  } catch (error) {
    self.postMessage({ status: "error", error: `${error.message}` });
  }
});
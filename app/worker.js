import { env, AutoProcessor, AutoModelForImageClassification, RawImage } from "@huggingface/transformers";

// Strictly allow local files only for 100% offline usage
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "/models/";

let processor = null;
let model = null;

self.addEventListener("message", async (event) => {
  const { action, rgbaData, width, height } = event.data;

  if (action === "analyze") {
    try {
      if (!processor || !model) {
        self.postMessage({ status: "loading", message: "Loading offline vision engine..." });
        
        processor = await AutoProcessor.from_pretrained("plant_analyzer_model");
        
        // FIX: Tell the library exactly which file to look for by setting quantized to false.
        // This forces it to load "model.onnx" instead of "model_quantized.onnx"
        model = await AutoModelForImageClassification.from_pretrained("plant_analyzer_model", {
          quantized: false 
        });
      }

      self.postMessage({ status: "processing", message: "Normalizing cellular data..." });

      const pixelData = new Uint8Array(rgbaData.buffer || rgbaData);
      const rawImage = new RawImage(pixelData, width, height, 4).rgb();
      
      const inputs = await processor(rawImage);

      self.postMessage({ status: "processing", message: "Running inference..." });

      const { logits } = await model(inputs);
      
      const maxLogit = Math.max(...logits.data);
      const scores = logits.data.map(l => Math.exp(l - maxLogit));
      const sumScores = scores.reduce((a, b) => a + b, 0);
      const probabilities = scores.map(s => s / sumScores);

      const id2label = model.config.id2label;
      const sortedResults = Object.keys(id2label)
        .map(id => ({
          label: id2label[id],
          score: probabilities[parseInt(id)]
        }))
        .sort((a, b) => b.score - a.score);

      const finalResults = sortedResults.slice(0, 3);

      self.postMessage({ status: "success", results: finalResults });
    } catch (error) {
      console.error("Worker Error:", error);
      self.postMessage({ status: "error", error: error.message });
    }
  }
});
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
        self.postMessage({ status: "loading", message: "Loading engine..." });
        
        // Load the model and processor from your local directory
        processor = await AutoProcessor.from_pretrained("plant_analyzer_model");
        model = await AutoModelForImageClassification.from_pretrained("plant_analyzer_model", {
          device: "webgpu"
        });
      }

      self.postMessage({ status: "processing", message: "Normalizing image data..." });

      // FIX: Ensure the image is converted to a clean RGB format before passing to the processor
      // This step converts the RGBA canvas data to RGB, which vision models expect.
      const rawImage = new RawImage(rgbaData, width, height, 4).rgb();
      
      // The processor handles resizing, cropping, and mean/std normalization (Crucial for accuracy)
      const inputs = await processor(rawImage);

      self.postMessage({ status: "processing", message: "Running inference..." });

      // Run inference
      const { logits } = await model(inputs);

      // DEBUG: Log raw logits to console so you can see if the model is actually outputting numbers
      // If these are all ~0, the model is not seeing a recognizable image.
      console.log("Raw Logits from Model:", logits.data);
      
      // Apply Softmax to convert raw logits to probabilities
      const maxLogit = Math.max(...logits.data);
      const scores = logits.data.map(l => Math.exp(l - maxLogit));
      const sumScores = scores.reduce((a, b) => a + b, 0);
      const probabilities = scores.map(s => s / sumScores);

      // Decode labels
      const id2label = model.config.id2label;
      const sortedResults = Object.keys(id2label)
        .map(id => ({
          label: id2label[id],
          score: probabilities[parseInt(id)]
        }))
        .sort((a, b) => b.score - a.score);

      // Return the top 3 matches without filtering out "low confidence" 
      // so you can see if the model is at least picking the right category (even at 5-10%)
      const finalResults = sortedResults.slice(0, 3);

      self.postMessage({ status: "success", results: finalResults });
    } catch (error) {
      console.error("Worker Error:", error);
      self.postMessage({ status: "error", error: error.message });
    }
  }
});
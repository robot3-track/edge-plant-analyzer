# Flora Diagnostics

This is a plant health scanner that runs right in your web browser. It checks pictures of plants on your device without sending any data to the internet. This makes it fast and keeps your photos private.

Live website: https://floradiagnostics.vercel.app

## UN Sustainable Development Goal Alignment

This app covers: UN Sustainable Development Goal 2: Zero Hunger. By helping farmers and home gardeners quickly identify crop diseases, this easy-to-access offline app can prevent massive food loss, promote sustainable agriculture, and improve overall food security. Furthermore, the importance of this app being able to run offline is crucial especially in rural farms and communities. To be able to quickly provide crop analysis for these locations can be a crucial component in a community's ability to thrive. Since 43% of the world, or 3.5 billion people live in rural communities with minimal connections to the internet- and among these people a total of 2.2 billion people (22%) don't have internet- this app can be a step to providing help to these rural farms.

## Features

* Works Offline: The app checks your plants on your phone or computer, so you do not need an internet connection.
* Safe and Private: Your pictures and camera stream are never saved or sent to a server.
* Finds 20 Plant Conditions: It checks for health and sickness in plants like Corn, Potato, Rice, Wheat, and Sugarcane.
* Uses Camera or Uploads: You can take a live photo with your camera or upload a picture from your files.

## Project Structure

* app/page.tsx: The main file for the web page, camera setup, and showing the results.
* app/worker.js: The background file that runs the AI model to check the plants.
* public/models/plant_analyzer_model/: The folder that holds the AI model files and plant names. (model_quantized.onnx)

const vision = require('@google-cloud/vision');
const {VertexAI} = require('@google-cloud/vertexai');

const path = require('path');
const fs = require('fs');
  

/**
 * TODO(developer): Update these variables before running the sample.
 */
export async function createNonStreamingMultipartContent(
  projectId :string,
  location:string,
  model :string,
  imageBase64 :string,
  instruction = 'Extract text from an image'
) {
  // Initialize Vertex with your Cloud project and location
  const vertexAI = new VertexAI({project: projectId, location: location});

  // Instantiate the model
  const generativeVisionModel = vertexAI.getGenerativeModel({
    model: model,
  });

  const filePart = {inline_data: {data: imageBase64, mimeType: 'image/jpeg'}};

  const textPart1 = {
      text: instruction,
    };
  
    const request = {
      contents: [{role: 'user', parts: [filePart, textPart1]}],
    };
  
    console.log('Prompt Text: ');
    const textPart2 = request.contents[0].parts[1];
  if ('text' in textPart2) {
    console.log(textPart1.text);
  }

  console.log('AI Response:');

  // Generate a response
  const response = await generativeVisionModel.generateContent(request);

  if (response && response.response && response.response.candidates && response.response.candidates[0] && response.response.candidates[0].content && response.response.candidates[0].content.parts && response.response.candidates[0].content.parts[0]) {
    // Select the text from the response
    const fullTextResponse = response.response.candidates[0].content.parts[0].text;
    console.log(fullTextResponse);
    return fullTextResponse;
  } else {
    console.error('Invalid response format:', response);
  }

}


"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNonStreamingMultipartContent = createNonStreamingMultipartContent;
// Importing the Google Cloud Vision and Vertex AI libraries
const vision = require('@google-cloud/vision');
const { VertexAI } = require('@google-cloud/vertexai');
const support_1 = require("appium/support"); // Logger utility
const log = support_1.logger.getLogger('AI-APPIUM-LENS');
// Importing Node.js modules for file and path handling
const path = require('path');
const fs = require('fs');
/**
 * Function to create a non-streaming multipart content request for Vertex AI
 * @param projectId - Google Cloud project ID
 * @param location - Location of the Vertex AI resources
 * @param model - The model to use for generating content
 * @param imageBase64 - Base64-encoded image data
 * @param instruction - Instruction for the AI model (default: 'Extract text from an image')
 */
function createNonStreamingMultipartContent(projectId_1, location_1, model_1, imageBase64_1) {
    return __awaiter(this, arguments, void 0, function* (projectId, location, model, imageBase64, instruction = 'Extract text from an image') {
        // Initialize Vertex AI client with the specified project and location
        const vertexAI = new VertexAI({ project: projectId, location: location });
        // Instantiate the generative model using the provided model name
        const generativeVisionModel = vertexAI.getGenerativeModel({
            model: model,
        });
        // Prepare the image data as a file part for the request
        const filePart = { inline_data: { data: imageBase64, mimeType: 'image/jpeg' } };
        // Prepare the instruction text as another part of the request
        const textPart1 = {
            text: instruction,
        };
        // Construct the request payload with the image and instruction
        const request = {
            contents: [{ role: 'user', parts: [filePart, textPart1] }],
        };
        // Log the instruction text for debugging purposes
        log.info('Prompt Text: ');
        const textPart2 = request.contents[0].parts[1];
        if ('text' in textPart2) {
            log.info(textPart1.text);
        }
        // Log a placeholder for the AI response
        log.info('AI Response:');
        // Generate a response using the generative model
        const response = yield generativeVisionModel.generateContent(request);
        // Check if the response format is valid and extract the text content
        if (response &&
            response.response &&
            response.response.candidates &&
            response.response.candidates[0] &&
            response.response.candidates[0].content &&
            response.response.candidates[0].content.parts &&
            response.response.candidates[0].content.parts[0]) {
            // Extract the text content from the response
            const fullTextResponse = response.response.candidates[0].content.parts[0].text;
            log.info(fullTextResponse);
            return fullTextResponse;
        }
        else {
            // Log an error if the response format is invalid
            log.error('Invalid response format:', response);
        }
    });
}

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
exports.getCoordinatesByInput = getCoordinatesByInput;
// Importing the Google Cloud Vision library for text detection
const googleVision = require('@google-cloud/vision');
const support_1 = require("appium/support"); // Logger utility
// Importing LokiJS for lightweight in-memory database
const loki = require('lokijs');
const log = support_1.logger.getLogger('AI-APPIUM-LENS');
// Initializing the LokiJS database and creating a collection for storing coordinates
const db = new loki('coordinates.db');
const coordinatesCollection = db.addCollection('coordinates');
// Main function to get coordinates of a text element on the screen
function getCoordinatesByInput(input, // Input text to search for
ssPath, // Path to the screenshot file
takeANewScreenShot, // Whether to take a new screenshot
sessionId, // Unique session ID for storing/retrieving data
index // Index of the matching text to retrieve
) {
    return __awaiter(this, void 0, void 0, function* () {
        const keys = []; // Array to store detected text descriptions
        const values = []; // Array to store corresponding coordinates
        try {
            if (takeANewScreenShot) {
                // If a new screenshot is required, perform text detection
                const client = new googleVision.ImageAnnotatorClient();
                const [result] = yield client.textDetection({
                    image: { source: { filename: ssPath } },
                });
                // Extract text annotations from the detection result
                const detections = result.textAnnotations;
                // Iterate through the detected text annotations
                detections.forEach((text, index) => {
                    log.info(`#index ${index} Description: ${text.description}`);
                    log.info('Bounding Poly:');
                    if (index > 0) { // Skip the first annotation (it contains the full text)
                        keys.push(text.description.trim().toLowerCase()); // Store the text description
                        const vertices = text.boundingPoly.vertices; // Get the bounding polygon vertices
                        vertices.forEach((vertex, vertexIndex) => {
                            if (vertexIndex == 1) { // Use the second vertex for coordinates
                                log.info(`Vertex ${vertexIndex}: (${vertex.x}, ${vertex.y})`);
                                values.push({ x: vertex.x, y: vertex.y }); // Store the coordinates
                            }
                        });
                    }
                });
                log.info('Keys:', keys);
                log.info('Values:', values);
                // Store the detected keys and values in the database
                coordinatesCollection.insert({ sessionId, keys, values });
                db.saveDatabase();
                log.info(`stored in db ${coordinatesCollection.findOne({ sessionId })} `);
            }
            else {
                // If no new screenshot is required, retrieve data from the database
                const record = coordinatesCollection.findOne({ sessionId });
                if (record) {
                    keys.push(...record.keys); // Retrieve stored keys
                    values.push(...record.values); // Retrieve stored values
                }
                else {
                    log.error('No record found for the given session ID');
                    return null;
                }
            }
            // Find the coordinates of the input text
            const points = getCoordinates(keys, values, input, index);
            if (points) {
                log.info(`Coordinates: (${points.x}, ${points.y})`);
                return points; // Return the coordinates if found
            }
            else {
                log.error('Unable to find the element on the screen, Please check the input text');
                return null; // Return null if the text is not found
            }
        }
        catch (error) {
            // Handle errors during text detection or database operations
            log.error("Error processing the image or query:", error);
            return null;
        }
    });
}
// Helper function to find coordinates of a matching text
function getCoordinates(keys, // Array of detected text descriptions
values, // Array of corresponding coordinates
input, // Input text to search for
matchIndex = 1 // Index of the matching text to retrieve
) {
    const inputKeys = input.split(' ').map((key) => key.toLowerCase()); // Split and normalize input text
    let matchCount = 0; // Counter for matches
    // Iterate through the keys to find a match
    for (let i = 0; i <= keys.length - inputKeys.length; i++) {
        let match = true;
        for (let j = 0; j < inputKeys.length; j++) {
            if (keys[i + j] !== inputKeys[j]) { // Check if the sequence matches
                match = false;
                break;
            }
        }
        if (match) {
            matchCount++;
            if (matchCount === matchIndex) { // Return the coordinates of the nth match
                return values[i];
            }
        }
    }
    return null; // Return null if no match is found
}

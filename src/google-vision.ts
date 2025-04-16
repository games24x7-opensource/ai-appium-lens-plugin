// Importing the Google Cloud Vision library for text detection
const googleVision = require('@google-cloud/vision');
import { logger } from 'appium/support'; // Logger utility

// Importing LokiJS for lightweight in-memory database
const loki = require('lokijs');
const log = logger.getLogger('AI-APPIUM-LENS');

// Initializing the LokiJS database and creating a collection for storing coordinates
const db = new loki('coordinates.db');
const coordinatesCollection = db.addCollection('coordinates');

// Interface for a vertex (point) in a bounding polygon
interface Vertex {
  x: number;
  y: number;
}

// Interface for a bounding polygon with an array of vertices
interface BoundingPoly {
  vertices: Vertex[];
}

// Interface for text annotations returned by Google Vision API
interface TextAnnotation {
  description: string; // Detected text
  boundingPoly: BoundingPoly; // Bounding polygon of the detected text
}

// Main function to get coordinates of a text element on the screen
export async function getCoordinatesByInput(
  input: string, // Input text to search for
  ssPath: string, // Path to the screenshot file
  takeANewScreenShot: boolean, // Whether to take a new screenshot
  sessionId: string, // Unique session ID for storing/retrieving data
  index: number // Index of the matching text to retrieve
): Promise<Coordinate | null> {
  const keys: string[] = []; // Array to store detected text descriptions
  const values: Coordinate[] = []; // Array to store corresponding coordinates

  try {
    if (takeANewScreenShot) {
      // If a new screenshot is required, perform text detection
      const client = new googleVision.ImageAnnotatorClient();
      const [result] = await client.textDetection({
        image: { source: { filename: ssPath } },
      });

      // Extract text annotations from the detection result
      const detections: TextAnnotation[] = result.textAnnotations as TextAnnotation[];

      // Iterate through the detected text annotations
      detections.forEach((text: TextAnnotation, index: number) => {
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

    } else {
      // If no new screenshot is required, retrieve data from the database
      const record = coordinatesCollection.findOne({ sessionId });
      if (record) {
        keys.push(...record.keys); // Retrieve stored keys
        values.push(...record.values); // Retrieve stored values
      } else {
        log.error('No record found for the given session ID');
        return null;
      }
    }

    // Find the coordinates of the input text
    const points = getCoordinates(keys, values, input, index);
    if (points) {
      log.info(`Coordinates: (${points.x}, ${points.y})`);
      return points; // Return the coordinates if found
    } else {
      log.error('Unable to find the element on the screen, Please check the input text');
      return null; // Return null if the text is not found
    }

  } catch (error) {
    // Handle errors during text detection or database operations
    log.error("Error processing the image or query:", error);
    return null;
  }
}

// Type definition for a coordinate (x, y)
export type Coordinate = { x: number, y: number };

// Helper function to find coordinates of a matching text
function getCoordinates(
  keys: string[], // Array of detected text descriptions
  values: Coordinate[], // Array of corresponding coordinates
  input: string, // Input text to search for
  matchIndex: number = 1 // Index of the matching text to retrieve
): Coordinate | null {
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

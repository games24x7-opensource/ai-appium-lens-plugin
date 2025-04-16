// Importing necessary modules and dependencies
import { BasePlugin } from '@appium/base-plugin'; // Base class for Appium plugins
import { logger } from 'appium/support'; // Logger utility
import { createNonStreamingMultipartContent } from './google-vertexai'; // Function to interact with Vertex AI
import { getCoordinatesByInput } from './google-vision'; // Function to get coordinates from Google Vision
const { getiOSDeviceMultiplier } = require('./utils/coordinate-finder'); // Utility to get iOS device multiplier
import loki from 'lokijs'; // Lightweight in-memory database
const TAP_DURATION_MS = 250; // Duration for tap actions in milliseconds

// Importing package information and initializing logger
const packageJson = require('../package.json');
const log = logger.getLogger('AI-APPIUM-LENS');

// Importing Node.js modules for file and path handling
const path = require('path');
const fs = require('fs');

// Initialize LokiJS database and create a collection for session data
const db = new loki('sessions.db');
const sessions = db.addCollection('sessions');

// Function to send instructions and image data to Google Vision AI
async function askGoogleVisionAI(instruction: string, encodedImg: string): Promise<any> {
    log.info(`Instruction Received`);
    let response;
    try {
        // Retrieve Google Cloud environment variables
        const projectId = process.env.GOOGLE_PROJECT_ID;
        const location = process.env.GOOGLE_LOCATION;
        const model = process.env.GOOGLE_MODEL;

        // Validate environment variables
        if (!projectId || !location || !model) {
            throw new Error('Google Cloud environment variables are not set');
        }

        // Call Vertex AI to process the instruction and image
        response = await createNonStreamingMultipartContent(projectId, location, model, encodedImg, instruction);
        console.log("AI Response:", response);
    } catch (error) {
        console.error("Error processing the image or query:", error);
    }
    return response;
}

// Regular expression to match plugin-specific routes
const SOURCE_URL_REGEX = new RegExp('/session/[^/]+/plugin/ai-appium-lens');

// Main plugin class extending the BasePlugin
class AIAppiumLens extends BasePlugin {
    constructor(pluginName: string) {
        super(pluginName);
    }

    // Determines if a route should bypass proxying
    shouldAvoidProxy(_method: any, route: string, _body: any): boolean {
        log.info(`Checking if route ${route} should be avoided`);
        return SOURCE_URL_REGEX.test(route);
    }

    // Define new API endpoints for the plugin
    static newMethodMap = {
        '/session/:sessionId/plugin/ai-appium-lens/askAI': {
            POST: {
                command: 'askAI',
                payloadParams: { required: ['instruction'] },
            },
        },
        '/session/:sessionId/plugin/ai-appium-lens/aiClick': {
            POST: {
                command: 'aiClick',
                payloadParams: { required: ['text', 'index', 'takeANewScreenShot'] },
            },
        },
        '/session/:sessionId/plugin/ai-appium-lens/aiAssert': {
            POST: {
                command: 'aiAssert',
                payloadParams: { required: ['text'] },
            },
        },
        '/session/:sessionId/plugin/ai-appium-lens/fetchUIElementsMetadataJson': {
            POST: {
                command: 'fetchUIElementsMetadataJsonaiAssert',
            },
        },
    };

    // Handles the askAI command
    async askAI(next: Function, driver: any, ...args: any[]): Promise<any> {
        const instruction = args[0];
        const takeANewScreenShot = true;
        const sessionId = driver.sessionId;

        // Capture a screenshot and convert it to base64
        const screenshotPath = await this.getScreenshotPath(driver, sessionId, takeANewScreenShot);
        const base64Screenshot = fs.readFileSync(screenshotPath, 'base64');

        // Send the instruction and screenshot to Google Vision AI
        return await askGoogleVisionAI(instruction, base64Screenshot);
    }

    // Handles the aiAssert command
    async aiAssert(next: Function, driver: any, ...args: any[]): Promise<any> {
        const instruction = args[0];
        const takeANewScreenShot = true;
        const sessionId = driver.sessionId;

        // Modify the instruction to request a true/false response
        const modifiedInstruction = `${instruction}, and return the response strictly in only true/false, if you don't agree with the statement, return false, else true`;

        // Capture a screenshot and convert it to base64
        const screenshotPath = await this.getScreenshotPath(driver, sessionId, takeANewScreenShot);
        const base64Screenshot = fs.readFileSync(screenshotPath, 'base64');

        // Send the modified instruction and screenshot to Google Vision AI
        const response = await askGoogleVisionAI(modifiedInstruction, base64Screenshot);
        return response.replace(/\n/g, '');
    }

    // Handles the fetchUIElementsMetadataJson command
    async fetchUIElementsMetadataJsonaiAssert(next: Function, driver: any, ...args: any[]): Promise<any> {
        // Instruction to fetch UI metadata in JSON format
        const modifiedInstruction = `return me a json in the form of what text you see, what color, what position, are aligned correctly, aligned/not aligned, also mention they are above/below which text, be specific, no mistake are allowed, set null if you don't find any data, example: {
            "text": "Home",
            "color": "black",
            "position": "bottom",
            "aligned": "not aligned",
            "above": "Enter mobile number",
            "below": "Upcoming match",
            "icon": "Home icon",
            "icon_color": "red",
            "icon_category": null,
            "UI Element": "Button",
            "UI Type": "tile"
        }`;

        // Capture a screenshot and convert it to base64
        const base64Screenshot = await this.takeScreenshot(driver);

        // Send the instruction and screenshot to Google Vision AI
        const response = await askGoogleVisionAI(modifiedInstruction, base64Screenshot);
        return response.replace(/```json|```/g, '').trim();
    }

    // Handles the aiClick command
    async aiClick(next: Function, driver: any, ...args: any[]): Promise<any> {
        const text = args[0];
        const index = args[1];
        const takeANewScreenShot = args[2];
        const sessionId = driver.sessionId;

        // Capture a screenshot and get the coordinates of the text
        const screenshotPath = await this.getScreenshotPath(driver, sessionId, takeANewScreenShot);
        const coordinates = await getCoordinatesByInput(text, screenshotPath, takeANewScreenShot, sessionId, index);

        if (!coordinates) {
            throw new Error('Coordinates not found');
        }

        // Adjust coordinates based on the device multiplier
        const multiplier = await this.getDeviceMultiplier(driver);
        let { x, y } = coordinates;
        x = x / multiplier;
        y = y / multiplier;

        // Create and perform a click action
        const action = this.createClickAction(x, y);
        if (driver.performActions) {
            return await driver.performActions([action]);
        }

        throw new Error("Driver did not implement the 'performActions' command");
    }

    // Captures a screenshot and saves it to a file
    private async takeScreenshot(driver: any): Promise<string> {
        const b64Screenshot = await driver.getScreenshot();
        const screenshotsDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir);
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = path.join(screenshotsDir, `screenshot-${timestamp}.png`);
        await fs.writeFileSync(screenshotPath, b64Screenshot, 'base64');
        const screenshotBuffer = fs.readFileSync(screenshotPath);
        return screenshotBuffer.toString('base64');
    }

    // Retrieves the path to the screenshot, either by taking a new one or using an existing one
    private async getScreenshotPath(driver: any, sessionId: string, takeANewScreenShot: boolean): Promise<string> {
        if (takeANewScreenShot) {
            const base64Screenshot = await this.takeScreenshot(driver);
            const screenshotsDir = path.join(__dirname, 'screenshots');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const screenshotPath = path.join(screenshotsDir, `screenshot-${timestamp}.png`);
            await fs.writeFileSync(screenshotPath, base64Screenshot, 'base64');

            let sessionData = sessions.findOne({ sessionId });
            if (sessionData) {
                sessionData.imageUrl = screenshotPath;
                sessions.update(sessionData);
            } else {
                sessions.insert({ sessionId, imageUrl: screenshotPath });
            }
            return screenshotPath;
        } else {
            const sessionData = sessions.findOne({ sessionId });
            if (sessionData) {
                return sessionData.imageUrl;
            } else {
                throw new Error('No existing screenshot found for this session');
            }
        }
    }

    // Determines the device multiplier based on the driver type
    private async getDeviceMultiplier(driver: any): Promise<number> {
        if (driver.constructor.name === 'AndroidUiautomator2Driver') {
            return 1;
        } else if (driver.constructor.name == 'XCUITestDriver') {
            const { width, height } = await driver.getWindowSize();
            return await getiOSDeviceMultiplier(width, height);
        }
        throw new Error('Unsupported driver type');
    }

    // Creates a click action at the specified coordinates
    private createClickAction(x: number, y: number) {
        return {
            type: 'pointer' as const,
            id: 'mouse',
            parameters: { pointerType: 'touch' as const },
            actions: [
                { type: 'pointerMove' as const, x, y, duration: 0 },
                { type: 'pointerDown' as const, button: 0 },
                { type: 'pause' as const, duration: TAP_DURATION_MS },
                { type: 'pointerUp' as const, button: 0 },
            ]
        };
    }
}

export default AIAppiumLens;
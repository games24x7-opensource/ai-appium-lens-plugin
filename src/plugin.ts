// Importing necessary modules and dependencies
import { BasePlugin } from '@appium/base-plugin'; // Base class for Appium plugins
import { logger } from 'appium/support'; // Logger utility
import { createNonStreamingMultipartContent } from './google-vertexai'; // Function to interact with Vertex AI
import { getCoordinatesByInput } from './google-vision'; // Function to get coordinates from Google Vision
const { getiOSDeviceMultiplier } = require('./utils/coordinate-finder'); // Utility to get iOS device multiplier
import loki from 'lokijs'; // Lightweight in-memory database
const TAP_DURATION_MS = 250; // Duration for tap actions in milliseconds

// Importing package information and initializing logger
const log = logger.getLogger('AiAppiumLens');

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
        log.info("AI Response:", response);
    } catch (error) {
        log.error("Error processing the image or query:", error);
    }
    return response;
}

// Regular expression to match plugin-specific routes
const SOURCE_URL_askAI_REGEX = new RegExp('/session/[^/]+/plugin/askAI');
const CHECK_TEXT_aiClick_URL_REGEX = new RegExp('/session/[^/]+/plugin/aiClick');
const CHECK_TEXT_aiAssert_URL_REGEX = new RegExp('/session/[^/]+/plugin/aiAssert');
const CHECK_TEXT_fetchUIElementsMetadataJson_URL_REGEX = new RegExp('/session/[^/]+/plugin/fetchUIElementsMetadataJson');
const CHECK_TEXT_aiGetAllLocators_URL_REGEX = new RegExp('/session/[^/]+/plugin/aiGetAllLocators');
const CHECK_TEXT_deleteSession_URL_REGEX = new RegExp('/session/[^/]+/plugin/deleteSession');

// Main plugin class extending the BasePlugin
class AIAppiumLens extends BasePlugin {

    commands = [
        'askAI',
        'aiClick',
        'aiAssert',
        'fetchUIElementsMetadataJson',
        'deleteSession',
        'aiGetAllLocators'
    ];

    constructor(pluginName: string) {
        super(pluginName);
    }

    // Custom implementation for the DELETE command
    async deleteSession(next: Function, driver: any, ...args: any[]): Promise<any> {
        log.info('DELETE /session/:sessionId called');
        const sessionId = args[0];
 
        // Perform any cleanup logic here
        log.info(`Cleaning up resources for sessionId: ${sessionId}`);

        sessions.removeWhere((obj) => obj.sessionId === sessionId);
        log.info(`Session ${sessionId} removed from database`);
        // Call the original deleteSession logic if needed
        await next();

        log.info(`Session ${sessionId} deleted successfully`);
        return { success: true, message: `Session ${sessionId} deleted` };
    }

    // Determines if a route should bypass proxying
    shouldAvoidProxy(_method: any, route: string, _body: any): boolean {
        log.info(`Checking if route ${route} should be avoided`);
        return SOURCE_URL_askAI_REGEX.test(route) ||
            CHECK_TEXT_aiClick_URL_REGEX.test(route) ||
            CHECK_TEXT_aiAssert_URL_REGEX.test(route) ||    
            CHECK_TEXT_fetchUIElementsMetadataJson_URL_REGEX.test(route) ||
            CHECK_TEXT_aiGetAllLocators_URL_REGEX.test(route) ||
            CHECK_TEXT_deleteSession_URL_REGEX.test(route);
    }

    

    // Define new API endpoints for the plugin
    static newMethodMap = {
        '/session/:sessionId/plugin/askAI': {
            POST: {
                command: 'askAI',
                payloadParams: { required: ['instruction'] },
            },
        },
        '/session/:sessionId/plugin/aiClick': {
            POST: {
                command: 'aiClick',
                payloadParams: { required: ['text', 'index', 'takeANewScreenShot'] },
            },
        },
        '/session/:sessionId/plugin/aiAssert': {
            POST: {
                command: 'aiAssert',
                payloadParams: { required: ['text'] },
            },
        },
        '/session/:sessionId/plugin/fetchUIElementsMetadataJson': {
            POST: {
                command: 'fetchUIElementsMetadataJsonaiAssert',
            },
        },
        '/session/:sessionId/plugin/aiGetAllLocators': {
            POST: {
                command: 'aiGetAllLocators',
            },
        },
    };

    // Handles the askAI command
    async aiGetAllLocators(next: Function, driver: any, ...args: any[]): Promise<any> {
        log.info(`aiGetAllLocators command called`);
        var instruction = 'You are a Appium Pro, You know UIAutomator2 very well, Providing you an image of mobile screen and its DOM XML, please provide me the locators of all the elements in the image and DOM, Also strickly follow Appium guideline, prioritize the accessibility id, id, and other strong locators first and at last if you dont find these, go to xpath but for those element no id present, return atleast xpth , dont just leave them, but try to give strong locators  and return the response strictly in only JSON format';  
        const takeANewScreenShot = true;
        const sessionId = driver.sessionId;
        // Capture a screenshot and convert it to base64
        const screenshotPath = await this.getScreenshotPath(driver, sessionId, takeANewScreenShot);
        const base64Screenshot = fs.readFileSync(screenshotPath, 'base64');
        const pageSource= await driver.getPageSource();
        instruction += `, and the DOM XML is ${pageSource}`;
        // Send the instruction and screenshot to Google Vision AI
        return await askGoogleVisionAI(instruction, base64Screenshot);
    }


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
            throw new Error(`Coordinates for locator/element not found for text: ${text}, Please check the text or locator`);
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
export {AIAppiumLens};
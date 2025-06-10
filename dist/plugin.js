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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAppiumLens = void 0;
// Importing necessary modules and dependencies
const base_plugin_1 = require("@appium/base-plugin"); // Base class for Appium plugins
const support_1 = require("appium/support"); // Logger utility
const google_vertexai_1 = require("./google-vertexai"); // Function to interact with Vertex AI
const google_vision_1 = require("./google-vision"); // Function to get coordinates from Google Vision
const { getiOSDeviceMultiplier } = require('./utils/coordinate-finder'); // Utility to get iOS device multiplier
const lokijs_1 = __importDefault(require("lokijs")); // Lightweight in-memory database
const TAP_DURATION_MS = 250; // Duration for tap actions in milliseconds
// Importing package information and initializing logger
const log = support_1.logger.getLogger('AiAppiumLens');
// Importing Node.js modules for file and path handling
const path = require('path');
const fs = require('fs');
// Initialize LokiJS database and create a collection for session data
const db = new lokijs_1.default('sessions.db');
const sessions = db.addCollection('sessions');
// Function to send instructions and image data to Google Vision AI
function askGoogleVisionAI(instruction, encodedImg) {
    return __awaiter(this, void 0, void 0, function* () {
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
            response = yield (0, google_vertexai_1.createNonStreamingMultipartContent)(projectId, location, model, encodedImg, instruction);
            log.info("AI Response:", response);
        }
        catch (error) {
            log.error("Error processing the image or query:", error);
        }
        return response;
    });
}
// Regular expression to match plugin-specific routes
const SOURCE_URL_askAI_REGEX = new RegExp('/session/[^/]+/plugin/askAI');
const CHECK_TEXT_aiClick_URL_REGEX = new RegExp('/session/[^/]+/plugin/aiClick');
const CHECK_TEXT_aiAssert_URL_REGEX = new RegExp('/session/[^/]+/plugin/aiAssert');
const CHECK_TEXT_fetchUIElementsMetadataJson_URL_REGEX = new RegExp('/session/[^/]+/plugin/fetchUIElementsMetadataJson');
const CHECK_TEXT_aiGetAllLocators_URL_REGEX = new RegExp('/session/[^/]+/plugin/aiGetAllLocators');
const CHECK_TEXT_deleteSession_URL_REGEX = new RegExp('/session/[^/]+/plugin/deleteSession');
// Main plugin class extending the BasePlugin
class AIAppiumLens extends base_plugin_1.BasePlugin {
    constructor(pluginName) {
        super(pluginName);
        this.commands = [
            'askAI',
            'aiClick',
            'aiAssert',
            'fetchUIElementsMetadataJson',
            'deleteSession',
            'aiGetAllLocators'
        ];
    }
    // Custom implementation for the DELETE command
    deleteSession(next, driver, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info('DELETE /session/:sessionId called');
            const sessionId = args[0];
            // Perform any cleanup logic here
            log.info(`Cleaning up resources for sessionId: ${sessionId}`);
            sessions.removeWhere((obj) => obj.sessionId === sessionId);
            log.info(`Session ${sessionId} removed from database`);
            // Call the original deleteSession logic if needed
            yield next();
            log.info(`Session ${sessionId} deleted successfully`);
            return { success: true, message: `Session ${sessionId} deleted` };
        });
    }
    // Determines if a route should bypass proxying
    shouldAvoidProxy(_method, route, _body) {
        log.info(`Checking if route ${route} should be avoided`);
        return SOURCE_URL_askAI_REGEX.test(route) ||
            CHECK_TEXT_aiClick_URL_REGEX.test(route) ||
            CHECK_TEXT_aiAssert_URL_REGEX.test(route) ||
            CHECK_TEXT_fetchUIElementsMetadataJson_URL_REGEX.test(route) ||
            CHECK_TEXT_aiGetAllLocators_URL_REGEX.test(route) ||
            CHECK_TEXT_deleteSession_URL_REGEX.test(route);
    }
    // Handles the askAI command
    aiGetAllLocators(next, driver, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
            log.info(`aiGetAllLocators command called`);
            var instruction = 'You are a Appium Pro, You know UIAutomator2 very well, Providing you an image of mobile screen and its DOM XML, please provide me the locators of all the elements in the image and DOM, Also strickly follow Appium guideline, prioritize the accessibility id, id, and other strong locators first and at last if you dont find these, go to xpath but for those element no id present, return atleast xpth , dont just leave them, but try to give strong locators  and return the response strictly in only JSON format';
            const takeANewScreenShot = true;
            const sessionId = driver.sessionId;
            // Capture a screenshot and convert it to base64
            const screenshotPath = yield this.getScreenshotPath(driver, sessionId, takeANewScreenShot);
            const base64Screenshot = fs.readFileSync(screenshotPath, 'base64');
            const pageSource = yield driver.getPageSource();
            instruction += `, and the DOM XML is ${pageSource}`;
            // Send the instruction and screenshot to Google Vision AI
            return yield askGoogleVisionAI(instruction, base64Screenshot);
        });
    }
    // Handles the askAI command
    askAI(next, driver, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
            const instruction = args[0];
            const takeANewScreenShot = true;
            const sessionId = driver.sessionId;
            // Capture a screenshot and convert it to base64
            const screenshotPath = yield this.getScreenshotPath(driver, sessionId, takeANewScreenShot);
            const base64Screenshot = fs.readFileSync(screenshotPath, 'base64');
            // Send the instruction and screenshot to Google Vision AI
            return yield askGoogleVisionAI(instruction, base64Screenshot);
        });
    }
    // Handles the aiAssert command
    aiAssert(next, driver, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
            const instruction = args[0];
            const takeANewScreenShot = true;
            const sessionId = driver.sessionId;
            // Modify the instruction to request a true/false response
            const modifiedInstruction = `${instruction}, and return the response strictly in only true/false, if you don't agree with the statement, return false, else true`;
            // Capture a screenshot and convert it to base64
            const screenshotPath = yield this.getScreenshotPath(driver, sessionId, takeANewScreenShot);
            const base64Screenshot = fs.readFileSync(screenshotPath, 'base64');
            // Send the modified instruction and screenshot to Google Vision AI
            const response = yield askGoogleVisionAI(modifiedInstruction, base64Screenshot);
            return response.replace(/\n/g, '');
        });
    }
    // Handles the fetchUIElementsMetadataJson command
    fetchUIElementsMetadataJsonaiAssert(next, driver, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const base64Screenshot = yield this.takeScreenshot(driver);
            // Send the instruction and screenshot to Google Vision AI
            const response = yield askGoogleVisionAI(modifiedInstruction, base64Screenshot);
            return response.replace(/```json|```/g, '').trim();
        });
    }
    // Handles the aiClick command
    aiClick(next, driver, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
            const text = args[0];
            const index = args[1];
            const takeANewScreenShot = args[2];
            const sessionId = driver.sessionId;
            // Capture a screenshot and get the coordinates of the text
            const screenshotPath = yield this.getScreenshotPath(driver, sessionId, takeANewScreenShot);
            const coordinates = yield (0, google_vision_1.getCoordinatesByInput)(text, screenshotPath, takeANewScreenShot, sessionId, index);
            if (!coordinates) {
                throw new Error(`Coordinates for locator/element not found for text: ${text}, Please check the text or locator`);
            }
            // Adjust coordinates based on the device multiplier
            const multiplier = yield this.getDeviceMultiplier(driver);
            let { x, y } = coordinates;
            x = x / multiplier;
            y = y / multiplier;
            // Create and perform a click action
            const action = this.createClickAction(x, y);
            if (driver.performActions) {
                return yield driver.performActions([action]);
            }
            throw new Error("Driver did not implement the 'performActions' command");
        });
    }
    // Captures a screenshot and saves it to a file
    takeScreenshot(driver) {
        return __awaiter(this, void 0, void 0, function* () {
            const b64Screenshot = yield driver.getScreenshot();
            const screenshotsDir = path.join(__dirname, 'screenshots');
            if (!fs.existsSync(screenshotsDir)) {
                fs.mkdirSync(screenshotsDir);
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const screenshotPath = path.join(screenshotsDir, `screenshot-${timestamp}.png`);
            yield fs.writeFileSync(screenshotPath, b64Screenshot, 'base64');
            const screenshotBuffer = fs.readFileSync(screenshotPath);
            return screenshotBuffer.toString('base64');
        });
    }
    // Retrieves the path to the screenshot, either by taking a new one or using an existing one
    getScreenshotPath(driver, sessionId, takeANewScreenShot) {
        return __awaiter(this, void 0, void 0, function* () {
            if (takeANewScreenShot) {
                const base64Screenshot = yield this.takeScreenshot(driver);
                const screenshotsDir = path.join(__dirname, 'screenshots');
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const screenshotPath = path.join(screenshotsDir, `screenshot-${timestamp}.png`);
                yield fs.writeFileSync(screenshotPath, base64Screenshot, 'base64');
                let sessionData = sessions.findOne({ sessionId });
                if (sessionData) {
                    sessionData.imageUrl = screenshotPath;
                    sessions.update(sessionData);
                }
                else {
                    sessions.insert({ sessionId, imageUrl: screenshotPath });
                }
                return screenshotPath;
            }
            else {
                const sessionData = sessions.findOne({ sessionId });
                if (sessionData) {
                    return sessionData.imageUrl;
                }
                else {
                    throw new Error('No existing screenshot found for this session');
                }
            }
        });
    }
    // Determines the device multiplier based on the driver type
    getDeviceMultiplier(driver) {
        return __awaiter(this, void 0, void 0, function* () {
            if (driver.constructor.name === 'AndroidUiautomator2Driver') {
                return 1;
            }
            else if (driver.constructor.name == 'XCUITestDriver') {
                const { width, height } = yield driver.getWindowSize();
                return yield getiOSDeviceMultiplier(width, height);
            }
            throw new Error('Unsupported driver type');
        });
    }
    // Creates a click action at the specified coordinates
    createClickAction(x, y) {
        return {
            type: 'pointer',
            id: 'mouse',
            parameters: { pointerType: 'touch' },
            actions: [
                { type: 'pointerMove', x, y, duration: 0 },
                { type: 'pointerDown', button: 0 },
                { type: 'pause', duration: TAP_DURATION_MS },
                { type: 'pointerUp', button: 0 },
            ]
        };
    }
}
exports.AIAppiumLens = AIAppiumLens;
// Define new API endpoints for the plugin
AIAppiumLens.newMethodMap = {
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
exports.default = AIAppiumLens;

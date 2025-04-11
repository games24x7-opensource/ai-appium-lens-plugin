# AI Appium Lens Plugin

## Overview

The AI Appium Lens Plugin is designed to enhance the capabilities of Appium by integrating AI-based image recognition and interaction features. This plugin leverages Google Cloud's Vision and Vertex AI services to provide advanced functionalities such as identifying elements on the screen and performing actions, based on AI analysis.

![image](https://github.com/games24x7-opensource/ai-appium-lens-plugin/blob/main/AI-APPIUM-LENS.png)

## Why is this Plugin Needed?

Automated testing often requires interacting with elements on the screen that may not have easily identifiable locators. Traditional methods rely heavily on static locators, which can be brittle and fail when the UI changes. The AI Appium Lens Plugin addresses this issue by using AI to dynamically identify and interact with elements based on their visual characteristics, making your tests more robust and adaptable to UI changes.

Key Highlights of the Plugin

Answer natural language queries about the app's UI, describes App UI, colour of button, what type of icon on the app, what are the input fields , what type screen is displayed?
Provide detailed accessibility insights for visually impaired users.
Generate actionable outputs like clickable element coordinates and hierarchical structures.

## Features

- **AI-based Element Identification**: Use Google Cloud Vision to identify elements on the screen based on their visual characteristics.
- **Dynamic Interaction**: Perform actions on elements identified by AI, reducing dependency on static locators.
- **Session Management**: Persist session data and image URLs to maintain context across multiple interactions.
- **Screenshot Handling**: Automatically take and manage screenshots for AI analysis.

## Prerequisite

You must have a google cloud account with payment configured and a project created.

- ** Active/Enable two service under google cloud

* Google Vision AI
* Google Vertex AI

Download google cloud sdk ( google-cloud-cli-darwin-arm.tar.gz) : https://cloud.google.com/sdk/docs/install

Unzip and go to the path

```sh
export PATH=$PATH:<Actual-PATH>/google-cloud-sdk/bin
source ~/.zshrc
gcloud init
gcloud auth application-default login

```

## Installation

To install the AI Appium Lens Plugin, follow these steps:

appium plugin install --source=npm ai-appium-lens

## Setting Up Google Cloud Account and Services

To use the AI Appium Lens Plugin with Google Vertex AI and Cloud Vision API, follow these steps:

### Prerequisites
- A Google Cloud account with payment configured.
- A project created in Google Cloud.

### Enable Required Services
1. **Google Vision AI**
2. **Google Vertex AI**

### Configuration Options
You can configure Google Cloud in two ways. Follow **Steps ** 
---

### Step : CI Setup
1. **Create a Service Account**:
    - Go to **IAM & Admin → Service Accounts** in the Google Cloud Console.
    - Click **Create Service Account** and provide a name and ID.
    - Assign roles like `Vertex AI User` and `Storage Admin`.
    - Click **Done** and download the service account key in JSON format.

2. **Set Environment Variables**:
    ```sh
    export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceaccount_vertex_ai.json"
    export GOOGLE_PROJECT_ID=your-project-id
    export GOOGLE_LOCATION=asia-south1
    export GOOGLE_MODEL=gemini-1.5-flash-001
    ```

---

### Enabling APIs
1. Go to **API & Services → Enable APIs and Services** in the Google Cloud Console.
2. Search for and enable:
    - **Vertex AI API**
    - **Cloud Vision API**

---

### Setting Up Billing
1. Go to **Billing** in the left sidebar.
2. Link a billing account to your project.

---

### Granting Administrative Access
1. Go to **IAM & Admin → IAM**.
2. Add users and assign roles like:
    - `Vertex AI Administrator`
    - `Editor`

---

By completing these steps, your Google Cloud account will be ready for use with the AI Appium Lens Plugin.

Supported LLM Model

The following models support multimodal prompt responses.

* gemini-2.0-flash
* gemini-1.5-pro	
* gemini-1.5-flash

One can find more details here : https://ai.google.dev/gemini-api/docs/models

## Usage

## AI Click

The aiClick method allows you to perform a click action on an element identified by AI.

* First Register the command :

    driver.addCommand(HttpMethod.POST,
            "/session/:sessionId/plugin/ai-appium-lens/aiClick",
            "aiClick");

```sh
          driver.execute("aiClick",
                ImmutableMap.of(
                        "text","Pick Team",
                        "index", 1, 
                        "takeANewScreenShot", true));
```

## Ask AI

* First Register the command :

```sh
    driver.addCommand(HttpMethod.POST,
                "/session/:sessionId/plugin/ai-appium-lens/askAI",
                "askAI");
```

The askAI method allows you to send an instruction to the AI and get a response based on the current screen.

```sh

     Response result =  driver.execute("askAI",
               ImmutableMap.of("instruction",
               "What do you see on the UI?" ));
       System.out.println(result.getValue());
```

## Assert AI

* First Register the command :

```sh

  driver.addCommand(HttpMethod.POST,
              "/session/:sessionId/plugin/ai-appium-lens/aiAssert",
              "aiAssert");
```

The assertAI method allows you get the response in true/false for your statement.

```sh

      Response response=driver.execute("aiAssert",
                ImmutableMap.of("text","do you see continue button in red color"
                        ));
        Boolean result=Boolean.valueOf(response.getValue().toString());
        System.out.println(result);
```

## fetchUIElementsMetadataJson AI

* First Register the command :

    driver.addCommand(HttpMethod.POST,
            "/session/:sessionId/plugin/ai-appium-lens/fetchUIElementsMetadataJson",
            "fetchUIElementsMetadataJson");

The fetchUIElementsMetadataJson method allows you to get complete UI meta info in json formate,
Example :

```json
[
  {
    "text": "No SIM",
    "color": "white",
    "position": "top left",
    "aligned": "not aligned",
    "above": null,
    "below": null,
    "icon": null,
    "icon_color": null,
    "icon_category": null
  },
  {
    "text": "1:13 AM",
    "color": "white",
    "position": "top right",
    "aligned": "not aligned",
    "above": null,
    "below": null,
    "icon": null,
    "icon_color": null,
    "icon_category": null
  }
]
```

```sh

   ObjectMapper objectMapper = new ObjectMapper();
        try {
            List<CustomJsonObject> jsonObjects = objectMapper.readValue(driver.execute("fetchUIElementsMetadataJson").getValue().toString().trim(), new TypeReference<List<CustomJsonObject>>() {});
        } catch (IOException e) {
            e.printStackTrace();
        }
```

Create this class since it is being used in above fetchUIElementsMetadataJson command.

```sh
@JsonIgnoreProperties(ignoreUnknown = true)
   static public class CustomJsonObject {
        private String text;
        private String color;
        private String position;
        private String aligned;
        private String above;
        private String below;
        private String icon;
        private String iconColor;
        private String iconCategory;

        // Getters and setters

        @JsonProperty("text")
        public String getText() {
            return text;
        }

        @JsonProperty("text")
        public void setText(String text) {
            this.text = text;
        }

        @JsonProperty("color")
        public String getColor() {
            return color;
        }

        @JsonProperty("color")
        public void setColor(String color) {
            this.color = color;
        }

        @JsonProperty("position")
        public String getPosition() {
            return position;
        }

        @JsonProperty("position")
        public void setPosition(String position) {
            this.position = position;
        }

        @JsonProperty("aligned")
        public String getAligned() {
            return aligned;
        }

        @JsonProperty("aligned")
        public void setAligned(String aligned) {
            this.aligned = aligned;
        }

        @JsonProperty("above")
        public String getAbove() {
            return above;
        }

        @JsonProperty("above")
        public void setAbove(String above) {
            this.above = above;
        }

        @JsonProperty("below")
        public String getBelow() {
            return below;
        }

        @JsonProperty("below")
        public void setBelow(String below) {
            this.below = below;
        }

        @JsonProperty("icon")
        public String getIcon() {
            return icon;
        }

        @JsonProperty("icon")
        public void setIcon(String icon) {
            this.icon = icon;
        }

        @JsonProperty("icon_color")
        public String getIconColor() {
            return iconColor;
        }

        @JsonProperty("icon_color")
        public void setIconColor(String iconColor) {
            this.iconColor = iconColor;
        }

        @JsonProperty("icon_category")
        public String getIconCategory() {
            return iconCategory;
        }

        @JsonProperty("icon_category")
        public void setIconCategory(String iconCategory) {
            this.iconCategory = iconCategory;
        }
    }

```
## About Core Contributor

* Anil Patidar (Games24x7) . [Linked in](https://in.linkedin.com/in/anilpatidar) [Follow me on LinkedIn](https://www.linkedin.com/comm/mynetwork/discovery-see-all?usecase=PEOPLE_FOLLOWS&followMember=anilpatidar)


Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## How to Contribute

1. Fork the repository to your GitHub account.
2. Clone the forked repository to your local machine.
3. Create a new branch for your feature or bug fix.
4. Make your changes and commit them with clear and descriptive messages.
5. Push your changes to your forked repository.
6. Open a pull request to the main repository, describing your changes in detail.
7. Address any feedback or requested changes from the maintainers.

Feel free to reach out by opening an issue if you have questions or need clarification.

## How to Run Locally

1. Clone the repository to your local machine:
    ```sh
    git clone https://github.com/games24x7-opensource/ai-appium-lens-plugin.git
    ```
2. Navigate to the project directory:
    ```sh
    cd ai-appium-lens-plugin
    ```
3. Install the required dependencies:
    ```sh
    npm install
    npm run install-plugin
    ```
4. Start the Appium server with the plugin:
    ```sh
    appium --use-plugins=ai-appium-lens
    ```
5. Configure your test scripts to use the AI Appium Lens Plugin.
6. Run your test scripts using your preferred test runner.

## How to Run Individual File

To run an individual file, use the following command:

```sh
npx ts-node ./src/google-vertexai.ts
```

[NPM Package Link](https://www.npmjs.com/package/ai-appium-lens)

License
This project is licensed under the MIT License.

[View License File](https://github.com/games24x7-opensource/ai-appium-lens-plugin/blob/main/LICENSE)


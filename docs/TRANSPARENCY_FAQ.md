## Build your own copilot - Generic Solution Accelerator: Responsible AI FAQ
- ### What is Build your own copilot - Generic Solution Accelerator?
    This solution accelerator is an open-source GitHub Repository to help create AI assistants using Azure OpenAI Service and Azure AI Search. This can be used by anyone looking for reusable architecture and code snippets to build AI assistants with their own enterprise data. The repository showcases a generic scenario of a user who wants to generate a document template based on a sample set of data.

- ### What can Build your own copilot - Generic Solution Accelerator do? 
    The sample solution included focuses on a generic use case - chat with your own data, generate a document template using your own data, and exporting the document in a docx format. The sample data is sourced from generic AI-generated promissory notes. The documents are intended for use as sample data only. The sample solution takes user input in text format and returns LLM responses in text format up to 800 tokens. It uses prompt flow to search data from AI search vector store, summarize the retrieved documents with Azure OpenAI.
  
- ### What is/are Build your own copilot - Generic Solution Accelerator’s intended use(s)?  
    This repository is to be used only as a solution accelerator following the open-source license terms listed in the GitHub repository. The example scenario’s intended purpose is to help users generate a document template to perform their work more efficiently.

- ### How was Build your own copilot - Generic Solution Accelerator evaluated? What metrics are used to measure performance?
    We have used AI Foundry Prompt flow evaluation SDK to test for harmful content, groundedness, and potential security risks. 
  
- ### What are the limitations of Build your own copilot - Generic Solution Accelerator? How can users minimize the impact of Build your own copilot - Generic Solution Accelerator’s limitations when using the system?
    This solution accelerator can only be used as a sample to accelerate the creation of AI assistants. The repository showcases a sample scenario of a user generating a document template. Users should review the system prompts provided and update as per their organizational guidance. Users should run their own evaluation flow either using the guidance provided in the GitHub repository or their choice of evaluation methods. AI-generated content may be inaccurate and should be manually reviewed. Currently, the sample repo is available in English only.  
- ### What operational factors and settings allow for effective and responsible use of Build your own copilot - Generic Solution Accelerator?
    Users can try different values for some parameters like system prompt, temperature, max tokens etc. shared as configurable environment variables while running run evaluations for AI assistants. Please note that these parameters are only provided as guidance to start the configuration but not as a complete available list to adjust the system behavior. Please always refer to the latest product documentation for these details or reach out to your Microsoft account team if you need assistance.

>Legal Notice: This is a pre-release and preview solution and therefore may not work correctly. Certain features may be missing or disabled. Microsoft may change or update this pre-release and preview solution at any time.

# Generic Build your own copilot Solution Accelerator

MENU: [**USER STORY**](#user-story) \| [**ONE-CLICK DEPLOY**](#one-click-deploy)  \| [**SUPPORTING DOCUMENTS**](#supporting-documents) \|
[**CUSTOMER TRUTH**](#customer-truth)


<h2><img src="./docs/images/userStory.png" width="64">
<br/>
User story
</h2>

**Solution accelerator overview**

This solution accelerator is a powerful tool that helps you create your own AI assistant(s). The accelerator can be used by any customer looking for reusable architecture and code snippets to build an AI assistant(s) with their own enterprise data. 

It leverages Azure OpenAI Service and Azure AI Search, to identify relevant documents, summarize unstructured information, and generate Word document templates using your own data. 

**Scenario**

This example focuses on a generic use case - chat with your own data, generate a document template using your own data, and exporting the document in a docx format.

The sample data is sourced from generic AI-generated promissory notes.
The documents are intended for use as sample data only.

<br/>

**Key features**

![Key Features](/docs/images/keyfeatures.png)

<br/>

**Below is an image of the solution accelerator.**

![Landing Page](/docs/images/landing_page.png)


<h2><img src="/docs/images//oneClickDeploy.png" width="64">
<br/>
One-click deploy
</h2>

### Prerequisites

To use this solution accelerator, you will need access to an [Azure subscription](https://azure.microsoft.com/free/) with permission to create resource groups and resources. While not required, a prior understanding of Azure OpenAI and Azure AI Search will be helpful.

For additional training and support, please see:

1. [Azure OpenAI](https://learn.microsoft.com/en-us/azure/ai-services/openai/) 
2. [Azure AI Search](https://learn.microsoft.com/en-us/azure/search/) 
3. [Azure AI Studio](https://learn.microsoft.com/en-us/azure/ai-studio/) 

### Solution accelerator architecture
![image](/docs/images/architecture.png)


 > Note: Some features contained in this repository are in private preview. Certain features might not be supported or might have constrained capabilities. For more information, see [Supplemental Terms of Use for Microsoft Azure Previews](https://azure.microsoft.com/en-us/support/legal/preview-supplemental-terms).


### **How to install/deploy**

1. Please check the link [Azure Products by Region](
https://azure.microsoft.com/en-us/explore/global-infrastructure/products-by-region/?products=all&regions=all) and choose a region where Azure AI Search, Azure OpenAI Service, and Azure AI Studio are available. If you are using the included sample data set, verify Document Intelligence (Form Recognizer) is available.

2. Click the following deployment button to create the required resources for this accelerator in your Azure Subscription.

   [![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fmicrosoft%2FGeneric-Build-your-own-copilot-Solution-Accelerator%2Fmain%2Finfrastructure%2Fdeployment.json)

3. You will need to select an Azure Subscription, create/select a Resource group, and Region. If your intention is to deploy this solution accelerator and the corresponding sample data set, the default settings will suffice.

If you are using your own data, the next step is optional.

4. Follow steps in [Sample data guide](./scripts/SAMPLE_DATA.md) to ingest the sample Promissory Note PDFs into the search index.

If you want to enable authentication, you will need to add an identity provider.

#### Add an identity provider
After deployment, you will need to add an identity provider to provide authentication support in your app. See [this tutorial](https://learn.microsoft.com/en-us/azure/app-service/scenario-secure-app-authentication-app-service) for more information.

If you don't add an identity provider, the chat functionality will allow anyone to access the chat functionality of your app. **This is not recommended for production apps.** To enable this restriction, you can add `AUTH_ENABLED=True` to the environment variables. This will enable authentication and prevent unauthorized access to the chat functionality of your app.

To add further access controls, update the logic in `getUserInfoList` in `frontend/src/pages/chat/Chat.tsx`. 

#### Recommended practices
1. **For enhanced relevance and accuracy**, we recommend implementing [Azure hybrid search](https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview) over full-text search. Azure hybrid search provides superior relevance, accuracy, support for complex queries, improved user experience, scalability, performance, advanced features, and integration with AI services. These advantages make it the ideal choice for modern applications that require robust and intelligent search capabilities.
2. **Importance of prompt engineering**. Prompt engineering is a critical aspect of working with AI models, especially when leveraging advanced capabilities such as those provided by Azure AI services. Proper prompt engineering ensures that the AI models generate accurate, relevant, and contextually appropriate responses. It involves carefully crafting and refining prompts to guide the model's behavior and output effectively. Neglecting prompt engineering can result in suboptimal performance, irrelevant outputs, and increased frustration for users. Therefore, it is essential to invest time and effort in prompt engineering to fully harness the potential of AI models

### Local deployment
Review the local deployment [README](./docs/README_LOCAL.md).
<br>
<h2><img src="./docs/images/supportingDocuments.png" width="64">
<br/>
Supporting documents
</h2>

Supporting documents coming soon.
<br>
<h2><img src="./docs/images/customerTruth.png" width="64">
</br>
Customer truth
</h2>
Customer stories coming soon.

<br/>


<h2>
</br>
Responsible AI Transparency FAQ 
</h2>

Please refer to [Transparency FAQ](./docs/TRANSPARENCY_FAQ.md) for responsible AI transparency details of this solution accelerator.

<br/>
<br/>
---

## Disclaimers

This release is an artificial intelligence (AI) system that generates text based on user input. The text generated by this system may include ungrounded content, meaning that it is not verified by any reliable source or based on any factual data. The data included in this release is synthetic, meaning that it is artificially created by the system and may contain factual errors or inconsistencies. Users of this release are responsible for determining the accuracy, validity, and suitability of any content generated by the system for their intended purposes. Users should not rely on the system output as a source of truth or as a substitute for human judgment or expertise.

This release only supports English language input and output. Users should not attempt to use the system with any other language or format. The system output may not be compatible with any translation tools or services, and may lose its meaning or coherence if translated.

This release does not reflect the opinions, views, or values of Microsoft Corporation or any of its affiliates, subsidiaries, or partners. The system output is solely based on the system's own logic and algorithms, and does not represent any endorsement, recommendation, or advice from Microsoft or any other entity. Microsoft disclaims any liability or responsibility for any damages, losses, or harms arising from the use of this release or its output by any user or third party.

This release does not provide any financial advice, and is not designed to replace the role of qualified client advisors in appropriately advising clients. Users should not use the system output for any financial decisions or transactions, and should consult with a professional financial advisor before taking any action based on the system output. Microsoft is not a financial institution or a fiduciary, and does not offer any financial products or services through this release or its output.

This release is intended as a proof of concept only, and is not a finished or polished product. It is not intended for commercial use or distribution, and is subject to change or discontinuation without notice. Any planned deployment of this release or its output should include comprehensive testing and evaluation to ensure it is fit for purpose and meets the user's requirements and expectations. Microsoft does not guarantee the quality, performance, reliability, or availability of this release or its output, and does not provide any warranty or support for it.

This Software requires the use of third-party components which are governed by separate proprietary or open-source licenses as identified below, and you must comply with the terms of each applicable license in order to use the Software. You acknowledge and agree that this license does not grant you a license or other right to use any such third-party proprietary or open-source components.

To the extent that the Software includes components or code used in or derived from Microsoft products or services, including without limitation Microsoft Azure Services (collectively, “Microsoft Products and Services”), you must also comply with the Product Terms applicable to such Microsoft Products and Services. You acknowledge and agree that the license governing the Software does not grant you a license or other right to use Microsoft Products and Services. Nothing in the license or this ReadMe file will serve to supersede, amend, terminate or modify any terms in the Product Terms for any Microsoft Products and Services.

You must also comply with all domestic and international export laws and regulations that apply to the Software, which include restrictions on destinations, end users, and end use. For further information on export restrictions, visit https://aka.ms/exporting.

You acknowledge that the Software and Microsoft Products and Services (1) are not designed, intended or made available as a medical device(s), and (2) are not designed or intended to be a substitute for professional medical advice, diagnosis, treatment, or judgment and should not be used to replace or as a substitute for professional medical advice, diagnosis, treatment, or judgment. Customer is solely responsible for displaying and/or obtaining appropriate consents, warnings, disclaimers, and acknowledgements to end users of Customer’s implementation of the Online Services.

You acknowledge the Software is not subject to SOC 1 and SOC 2 compliance audits. No Microsoft technology, nor any of its component technologies, including the Software, is intended or made available as a substitute for the professional advice, opinion, or judgement of a certified financial services professional. Do not use the Software to replace, substitute, or provide professional financial advice or judgment.

BY ACCESSING OR USING THE SOFTWARE, YOU ACKNOWLEDGE THAT THE SOFTWARE IS NOT DESIGNED OR INTENDED TO SUPPORT ANY USE IN WHICH A SERVICE INTERRUPTION, DEFECT, ERROR, OR OTHER FAILURE OF THE SOFTWARE COULD RESULT IN THE DEATH OR SERIOUS BODILY INJURY OF ANY PERSON OR IN PHYSICAL OR ENVIRONMENTAL DAMAGE (COLLECTIVELY, “HIGH-RISK USE”), AND THAT YOU WILL ENSURE THAT, IN THE EVENT OF ANY INTERRUPTION, DEFECT, ERROR, OR OTHER FAILURE OF THE SOFTWARE, THE SAFETY OF PEOPLE, PROPERTY, AND THE ENVIRONMENT ARE NOT REDUCED BELOW A LEVEL THAT IS REASONABLY, APPROPRIATE, AND LEGAL, WHETHER IN GENERAL OR IN A SPECIFIC INDUSTRY. BY ACCESSING THE SOFTWARE, YOU FURTHER ACKNOWLEDGE THAT YOUR HIGH-RISK USE OF THE SOFTWARE IS AT YOUR OWN RISK.  

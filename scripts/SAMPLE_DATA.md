# Sample Data Preparation 

## Prerequisites
- Use an existing Azure Document Intelligence (Form Recognizer) resource or create a new one. If creating a new one, you can create the [Azure Document Intelligence (Form Recognizer)](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/create-document-intelligence-resource?view=doc-intel-4.0.0) in the same resource group created earlier via "Deploy to Azure". 
    - Make note of the name of the resource and one of the [keys](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/create-document-intelligence-resource?view=doc-intel-4.0.0#get-endpoint-url-and-keys). These values are required when running the data ingestion script.
- Clone this repository in VS Code. [Tutorial](https://learn.microsoft.com/en-us/azure/developer/javascript/how-to/with-visual-studio-code/clone-github-repository?tabs=activity-bar)


## Create the config.json and .env
- Within the scripts folder, create a new .env file. 
- Copy and paste the contents from the scripts/.env.sample file. 
- Replace the values for `<AZURE_OPENAI_RESOURCE>` and `<AZURE_OPENAI_KEY>` with the name of the Azure OpenAI resource and either KEY 1 or KEY 2.
- Save the .env file.
- Within the scripts folder, create a config file `config.json`. The format will be a list of JSON objects, with each object specifying a configuration of local data path and target search service and index. Assuming you used "Deploy to Azure" to deploy this solution accelerator, these values can be found within the resources themselves. If you did not change the Search Index name, the default value is: promissory-notes-index. Copy and paste the following script block into the config.json file and update accordingly. 

```
[
    {
        "data_path": "../data",
        "location": "<azure region, e.g. 'westus2'>", 
        "subscription_id": "<subscription id>",
        "resource_group": "<resource group name>",
        "search_service_name": "<search service name to use>",
        "index_name": "<search index name to use>",
        "chunk_size": 1024,
        "token_overlap": 128,
        "semantic_config_name": "default",
        "language": "en"
    }
]
```
- Save the config.json file.

## Run the data preparation in Windows
- If you have not done so already, open the cloned repository in VS Code.
- Create a virtual environment for the sample data preparation
    - Open a terminal window.
    - Create the virtual environment: `python -m venv scriptsenv`
    - Activate the virtual environment: `.\scriptsenv\bin\activate`
- Install the necessary packages listed in scripts/requirements-dev.txt, e.g. `pip install -r requirements-dev.txt`
- Create the index and ingest PDF data with Form Recognizer 
    - Replace `<form-rec-resource-name>` with the name of the existing or recently created Azure Document Intelligence (Form Recognizer) resource and replace `<form-rec-key>` with key 1 or key 2 of the existing or recently created Azure Document Intelligence (Form Recognizer) resource:
    `python data_preparation.py --config config.json --njobs=1 --form-rec-resource <form-rec-resource-name> --form-rec-key <form-rec-key>`
- Upon successful completion, deactivate the virtual environment: `deactivate`

## Run the data preparation in Linux or macOS
- If you have not done so already, open the cloned repository in VS Code.
- Create a virtual environment for the sample data preparation
    - Open a terminal window.
    - Create the virtual environment: `python3 -m venv scriptsenv`
    - Activate the virtual environment: `source scriptsenv/bin/activate`
- Install the necessary packages listed in scripts/requirements-dev.txt, e.g. `pip install --user -r requirements-dev.txt`
- Create the index and ingest PDF data with Form Recognizer 
    - Replace `<form-rec-resource-name>` with the name of the existing or recently created Azure Document Intelligence (Form Recognizer) resource and replace `<form-rec-key>` with key 1 or key 2 of the existing or recently created Azure Document Intelligence (Form Recognizer) resource:
    `python data_preparation.py --config config.json --njobs=1 --form-rec-resource <form-rec-resource-name> --form-rec-key <form-rec-key>`
- Upon successful completion, deactivate the virtual environment: `deactivate`


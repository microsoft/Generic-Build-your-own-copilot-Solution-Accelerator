from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchFieldDataType,
    SimpleField,
    SearchableField,
)

from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SimpleField,
    SearchFieldDataType,
    SearchableField,
    SearchField,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SemanticConfiguration,
    SemanticPrioritizedFields,
    SemanticField,
    SemanticSearch,
    SearchIndex
)
from azure.identity import DefaultAzureCredential
import json
import argparse


if __name__ == "__main__":
    # parse arguments
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_file_path", type=str, required=True)
    parser.add_argument("--azure_ai_search_endpoint", type=str, required=True)
    parser.add_argument("--azure_ai_search_key", type=str, required=True)
    parser.add_argument("--azure_search_index", type=str, required=True)
    parser.add_argument("--embedding_dim", type=int, required=True, default=1536)

    args = parser.parse_args()
    azure_ai_search_endpoint = args.azure_ai_search_endpoint
    azure_ai_search_key = key_credential = args.azure_ai_search_key
    index_name = args.azure_search_index
    embedding_dim = args.embedding_dim
    credential = DefaultAzureCredential()
    
    # Create a search index
    index_client = SearchIndexClient(endpoint=azure_ai_search_endpoint, credential=AzureKeyCredential(key_credential))
    fields = [
        SimpleField(name="id", type=SearchFieldDataType.String, key=True, sortable=True, filterable=True, facetable=True),
        SearchableField(name="content", type=SearchFieldDataType.String),
        SearchField(name="content_vector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                    searchable=True, vector_search_dimensions=embedding_dim, vector_search_profile_name="myHnswProfile"),
    ]

    # Configure the vector search configuration
    vector_search = VectorSearch(
        algorithms=[
            HnswAlgorithmConfiguration(
                name="myHnsw"
            )
        ],
        profiles=[
            VectorSearchProfile(
                name="myHnswProfile",
                algorithm_configuration_name="myHnsw",
            )
        ]
    )

    semantic_config = SemanticConfiguration(
        name="my-semantic-config",
        prioritized_fields=SemanticPrioritizedFields(
            content_fields=[SemanticField(field_name="content")]
        )
    )

    # Create the semantic settings with the configuration
    semantic_search = SemanticSearch(configurations=[semantic_config])
    index = SearchIndex(name=index_name, fields=fields, vector_search=vector_search, semantic_search=semantic_search)
    result = index_client.create_or_update_index(index)
    print(f'{result.name} created')
    search_client = SearchClient(endpoint=azure_ai_search_endpoint, index_name=index_name, credential=AzureKeyCredential(key_credential))

    with open(args.input_file_path, "r") as input_file:
        for i, line in enumerate(input_file):
            if i % 100 == 0:
                print("Processed {} documents.".format(i))
        
            try:
                document = json.loads(line)
                result = search_client.upload_documents([document])
            except Exception as e:
                print(f"Error: {e}")
    
    print(f"Uploaded documents")
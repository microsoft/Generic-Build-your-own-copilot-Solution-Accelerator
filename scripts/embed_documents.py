import argparse
from asyncio import sleep
import json

from azure.identity import DefaultAzureCredential
from data_utils import get_embedding
import time

RETRY_COUNT = 5

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_file_path", type=str, required=True)
    parser.add_argument("--output_file_path", type=str, required=True)
    parser.add_argument("--embedding_endpoint", type=str, required=True)
    parser.add_argument("--embedding_key", type=str, required=True)
    parser.add_argument("--api_version", type=str, default="2024-02-01")
    parser.add_argument("--limit", type=int, default=None, help="Limit the number of documents to embed.")
        
    args = parser.parse_args()
    credential = DefaultAzureCredential()
    embedding_endpoint = args.embedding_endpoint
    embedding_key = args.embedding_key
    t = time.time()

    # Embed documents
    print("Generating embeddings...")
    with open(args.input_file_path) as input_file, open(args.output_file_path, "w") as output_file:
        for i, line in enumerate(input_file):
            if args.limit and i >= args.limit:
                break

            if i % 100 == 0:
                print("Processed {} documents.".format(i))

            document = json.loads(line)
            # Sleep/Retry in case embedding model is rate limited.
            for _ in range(RETRY_COUNT):
                try:
                    embedding = get_embedding(document["content"], embedding_endpoint, embedding_key)
                    document["content_vector"] = embedding
                    break
                except Exception as e:
                    print("Error generating embedding. Retrying...")
                    sleep(30)
            
            output_file.write(json.dumps(document) + "\n")

    print("Embeddings generated and saved to {}.".format(args.output_file_path))
    print("Time taken: ", time.time() - t)


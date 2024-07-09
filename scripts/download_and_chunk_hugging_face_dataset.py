import argparse
from datasets import load_dataset
import json
import uuid


def chunk_content(content, chunk_size, overlap):
    chunks = []
    for i in range(0, len(content), chunk_size - overlap):
        chunks.append(content[i:i + chunk_size])
    return chunks

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--huggingface_dataset_name", type=str, required=True)
    parser.add_argument("--chunk_size", type=int, required=True)
    parser.add_argument("--overlap", type=int, required=True)
    parser.add_argument("--output_file_path", type=str, required=True)
    parser.add_argument("--content_field", type=str, required=True)
    args = parser.parse_args()

    # Load the dataset
    dataset = load_dataset(
        args.huggingface_dataset_name,
        split="train"
    )

    # Save the dataset to a file
    with open(args.output_file_path, "w") as f:
        for row in dataset:
            # check if 'promissory' is in the content field
            if 'promissory' not in row[args.content_field].lower():
                continue

            uuid_prefix = str(uuid.uuid4())
            tokenized_content = row[args.content_field].split(" ")
            chunks = chunk_content(tokenized_content, args.chunk_size, args.overlap)

            # write muiltiple chunks to file containing all the fields
            for chunk_id, chunk in enumerate(chunks):
                document = {
                    "id": f"{uuid_prefix}-{chunk_id}"
                }

                for key, value in row.items():
                    if key == args.content_field:
                        document["content"] = " ".join(chunk)
                    else:
                        document[key] = value

                f.write(json.dumps(document) + "\n")

    print(f"Dataset saved to {args.output_file_path}")
    




    

            




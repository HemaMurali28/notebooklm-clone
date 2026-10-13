from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import os
import boto3
from botocore.exceptions import ClientError


# --------------------------------------------------
# FastAPI Application
# --------------------------------------------------

app = FastAPI(
    title="NotebookLM Clone API",
    description="RAG-based Document Question Answering API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# AWS Configuration
# --------------------------------------------------

S3_BUCKET_NAME = os.getenv(
    "S3_BUCKET_NAME",
    "notebooklm-clone-documents-hema-2026"
)

AWS_REGION = os.getenv(
    "AWS_REGION",
    "ap-south-1"
)

KNOWLEDGE_BASE_ID = "OIJR4F0YDT"

# Nova Lite APAC inference profile
BEDROCK_MODEL_ARN = os.getenv(
    "BEDROCK_MODEL_ARN",
    "arn:aws:bedrock:ap-south-1:978184426999:inference-profile/apac.amazon.nova-lite-v1:0"
)


# --------------------------------------------------
# AWS Session
# --------------------------------------------------

aws_session = boto3.Session(
    region_name=AWS_REGION
)

s3_client = aws_session.client("s3")

bedrock_agent_runtime = aws_session.client(
    "bedrock-agent-runtime",
    region_name=AWS_REGION
)


# --------------------------------------------------
# Request Model
# --------------------------------------------------

class QueryRequest(BaseModel):
    question: str
    selected_document: str | None = None


# --------------------------------------------------
# Home Endpoint
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "NotebookLM Clone API is running!"
    }


# --------------------------------------------------
# Get Documents
# --------------------------------------------------

@app.get("/documents")
def get_documents():

    try:

        response = s3_client.list_objects_v2(
            Bucket=S3_BUCKET_NAME
        )

        documents = []

        for obj in response.get("Contents", []):

            if obj["Key"].endswith(".metadata.json"):
                continue

            documents.append({
                "filename": obj["Key"],
                "size": obj["Size"]
            })

        return {
            "count": len(documents),
            "documents": documents
        }

    except ClientError as e:

        raise HTTPException(
            status_code=500,
            detail="Failed to get documents from S3: " + str(e)
        )


# --------------------------------------------------
# Upload Document
# --------------------------------------------------

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...)
):

    allowed_extensions = {
        ".pdf",
        ".docx",
        ".txt"
    }

    file_extension = Path(file.filename).suffix.lower()

    if file_extension not in allowed_extensions:

        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOCX and TXT files are allowed."
        )

    try:

        s3_client.upload_fileobj(
            file.file,
            S3_BUCKET_NAME,
            file.filename,
            ExtraArgs={
                "ContentType": (
                    file.content_type
                    or "application/octet-stream"
                )
            }
        )

        return {
            "message": "File uploaded successfully to S3!",
            "filename": file.filename,
            "bucket": S3_BUCKET_NAME,
            "s3_key": file.filename
        }

    except ClientError as e:

        raise HTTPException(
            status_code=500,
            detail=f"S3 upload failed: {str(e)}"
        )


# --------------------------------------------------
# Query Knowledge Base
# --------------------------------------------------

@app.post("/query")
async def query_knowledge_base(
    request: QueryRequest
):
    print("QUERY RECEIVED:", request)

    if not request.question.strip():

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    try:

        # ------------------------------------------
        # Knowledge Base configuration
        # ------------------------------------------

        knowledge_base_configuration = {
            "knowledgeBaseId": KNOWLEDGE_BASE_ID,
            "modelArn": BEDROCK_MODEL_ARN
    }

        if request.selected_document:
            knowledge_base_configuration["retrievalConfiguration"] = {
                "vectorSearchConfiguration": {
                    "numberOfResults": 5,
                    "filter": {
                        "equals": {
                            "key": "document_name",
                            "value": request.selected_document
                        }
                    }
                }
            }

        


        # ------------------------------------------

        # Query Bedrock Knowledge Base
        # ------------------------------------------
        print("FINAL KB CONFIG:", knowledge_base_configuration)
        response = bedrock_agent_runtime.retrieve_and_generate(

            input={
                "text": request.question
            },

            retrieveAndGenerateConfiguration={

                "type": "KNOWLEDGE_BASE",

                "knowledgeBaseConfiguration":
                    knowledge_base_configuration
            }
        )

        print("BEDROCK RAW RESPONSE:")
        print(response)
        # ------------------------------------------
        # Get Answer
        # ------------------------------------------

        answer = response.get(
            "output",
            {}
        ).get(
            "text",
            ""
        )


        # ------------------------------------------
        # Get Citations
        # ------------------------------------------

        citations = []

        for citation in response.get(
            "citations",
            []
        ):

            for reference in citation.get(
                "retrievedReferences",
                []
            ):

                content = reference.get(
                    "content",
                    {}
                )

                location = reference.get(
                    "location",
                    {}
                )

                citations.append({

                    "text":
                        content.get(
                            "text",
                            ""
                        ),

                    "location":
                        location
                })


        # ------------------------------------------
        # Fallback Answer
        # ------------------------------------------

        if not answer:

            answer = (
                "I could not find relevant information "
                "in the selected document."
            )


        # ------------------------------------------
        # Return Response
        # ------------------------------------------

        return {

            "question":
                request.question,

            "selected_document":
                request.selected_document,

            "answer":
                answer,

            "citations":
                citations
        }


    # ----------------------------------------------
    # AWS / Bedrock Error
    # ----------------------------------------------

    except ClientError as e:

        print(
            "BEDROCK CLIENT ERROR:",
            str(e)
        )

        raise HTTPException(

            status_code=500,

            detail=(
                "Knowledge Base query failed: "
                + str(e)
            )
        )


    # ----------------------------------------------
    # General Error
    # ----------------------------------------------

    except Exception as e:

        print(
            "QUERY ERROR:",
            str(e)
        )

        raise HTTPException(

            status_code=500,

            detail=(
                "Unexpected error: "
                + str(e)
            )
        )
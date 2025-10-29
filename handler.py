import json
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def hello(event, context):
    """
    Sample Lambda function handler
    """
    logger.info("Received event: %s", json.dumps(event))

    body = {
        "message": "Hello from Serverless Framework!",
        "input": event,
    }

    response = {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body)
    }

    return response

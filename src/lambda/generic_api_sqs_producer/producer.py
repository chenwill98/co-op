import boto3
import json
import requests

sqs = boto3.client('sqs')
QUEUE_URL_DICT = {
    'properties': 'https://sqs.us-east-2.amazonaws.com/405894840561/properties_api_queue',
    'property_details': 'https://sqs.us-east-2.amazonaws.com/405894840561/property_details_api_queue',
}

URL = "https://streeteasy-api.p.rapidapi.com/rentals/"

HEADERS = {
	"x-rapidapi-key": "5380093e56mshe942db5dba92b91p17d4f3jsnb25b188be832",
	"x-rapidapi-host": ""
}

import requests

url = "https://streeteasy-api.p.rapidapi.com/rentals/4572017"

headers = {
	"x-rapidapi-key": "5380093e56mshe942db5dba92b91p17d4f3jsnb25b188be832",
	"x-rapidapi-host": "streeteasy-api.p.rapidapi.com"
}

response = requests.get(url, headers=headers)

print(response.json())

def generate_api_payloads(api_type):
    # Add logic for each API type
    if api_type == "properties":
        properties_url = URL + "search"
        return [{"endpoint": properties_url, 
                 "headers": HEADERS,
                 "params": {"areas":"all-downtown,all-midtown", "limit":"500"}}]
    elif api_type == "property_details":
        return [{"endpoint": "streeteasy-api.p.rapidapi.com", "params": {"key": "valueB"}}]
    else:
        raise ValueError(f"Unsupported API type: {api_type}")

def lambda_handler(event, context):
    api_type = event["api_type"]
    payloads = generate_api_payloads(api_type)

    for payload in payloads:
        sqs.send_message(QueueUrl=QUEUE_URL_DICT[api_type], MessageBody=json.dumps(payload))

    return {"statusCode": 200, "body": f"Processed API type {api_type}"}
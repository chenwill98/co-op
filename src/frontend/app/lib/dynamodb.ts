import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Create DynamoDB client without specifying credentials
// The SDK will look for an attached IAM role by default.
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
});

// Create document client for easier handling of JavaScript objects
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
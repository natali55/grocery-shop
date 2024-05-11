import { SQSEvent } from "aws-lambda";
import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';
import { catalogBatchProcess } from '../src/product-service/catalog-batch-process';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-sns');
jest.mock('uuid');

describe('catalogBatchProcess', () => {
    let event: SQSEvent;
    let dynamoDBClient: DynamoDBClient;
    let snsClient: SNSClient;

    beforeEach(() => {
        event = {
            Records: [
                {
                    body: JSON.stringify({
                        title: 'Test Product',
                        description: 'Test Description',
                        price: 100,
                        count: 10
                    })
                }
            ]
        } as SQSEvent;

        dynamoDBClient = new DynamoDBClient();
        snsClient = new SNSClient();

        (DynamoDBClient as jest.Mock).mockReturnValue(dynamoDBClient);
        (SNSClient as jest.Mock).mockReturnValue(snsClient);
        (uuidv4 as jest.Mock).mockReturnValue('test-uuid');
    });

    it('should process product successfully', async () => {
        // @ts-ignore
        const dynamoDBSendSpy = jest.spyOn(dynamoDBClient, 'send').mockResolvedValue({});
        // @ts-ignore
        const snsSendSpy = jest.spyOn(snsClient, 'send').mockResolvedValue({});

        const response = await catalogBatchProcess(event);

        expect(dynamoDBSendSpy).toHaveBeenCalledWith(expect.any(BatchWriteItemCommand));
        expect(snsSendSpy).toHaveBeenCalledWith(expect.any(PublishCommand));
        expect(response).toEqual({
            statusCode: 200,
            body: JSON.stringify('Product processed')
        });
    });

    it('should return error response when product data is incomplete', async () => {
        event.Records[0].body = JSON.stringify({
            title: 'Test Product',
            description: 'Test Description',
            price: 100
        });

        const response = await catalogBatchProcess(event);

        expect(response).toEqual({
            statusCode: 400,
            body: JSON.stringify({ message: 'Wrong product format' })
        });
    });

    it('should return error response when an error occurs', async () => {
        // @ts-ignore
        const dynamoDBSendSpy = jest.spyOn(dynamoDBClient, 'send').mockRejectedValue(new Error('Test Error'));

        const response = await catalogBatchProcess(event);

        expect(dynamoDBSendSpy).toHaveBeenCalledWith(expect.any(BatchWriteItemCommand));
        expect(response).toEqual({
            statusCode: 500,
            body: JSON.stringify(new Error('Test Error'))
        });
    });
});

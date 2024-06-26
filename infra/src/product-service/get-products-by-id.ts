import { DynamoDBClient, GetItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { products } from './products';

const dynamoDB: DynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const productsTableName: string = process.env.PRODUCTS_TABLE_NAME as string;
const stockTableName: string = process.env.STOCK_TABLE_NAME as string;

export const getProductsById = async (event: { pathParameters: { product_id: string } }) => {
    // const productById: any = products.find((product: any) => product.id === event.productId)

    try {
        const productId = event.pathParameters.product_id;

        const productCommand = new GetItemCommand({
            TableName: productsTableName,
            Key: { id: { S: productId } },
        });
        const productRaw = await dynamoDB.send(productCommand);

        console.log('Read Product succeeded:', JSON.stringify(productRaw, null, 2));

        if (!productRaw.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Not found' }),
            };
        }
        const product = {
            id: productRaw.Item.id.S,
            title: productRaw.Item.title.S,
            description: productRaw.Item.description.S,
            price: Number(productRaw.Item.price.N),
        };

        const stockCommand = new GetItemCommand({
            TableName: stockTableName,
            Key: { product_id: { S: productId } }
        });
        const stockItemRaw = await dynamoDB.send(stockCommand);
        console.log('Read Stock succeeded:', JSON.stringify(stockItemRaw, null, 2));

        if (!stockItemRaw.Item) {
            return new Error('Stock item not found');
        }

        const stockItemCount =  Number(stockItemRaw.Item.count.N);

        if (stockItemCount === 0) {
            return new Error('Product is out of stock');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({...product, count: stockItemCount})
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    }
}

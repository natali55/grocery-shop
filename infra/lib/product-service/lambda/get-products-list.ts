import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { Handler } from 'aws-lambda';


const dynamoDB: DynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const productsTableName: string = process.env.PRODUCTS_TABLE_NAME as string;
const stockTableName: string = process.env.STOCK_TABLE_NAME as string;

export const getProductsList: Handler = async (event, context) => {
    try {
        const productsCommand = new ScanCommand({
            TableName: productsTableName
        });
        const productsRaw = await dynamoDB.send(productsCommand);
        console.log('Read Products succeeded:', JSON.stringify(productsRaw, null, 2));
        const products = productsRaw.Items?.map((productItem) =>  ({
            id: productItem.id.S,
            title: productItem.title.S,
            description: productItem.description.S,
            price: Number(productItem.price.N),
        }));

        const stockCommand = new ScanCommand({
            TableName: stockTableName
        });
        const stockRaw = await dynamoDB.send(stockCommand);
        console.log('Read Stock succeeded:', JSON.stringify(stockRaw, null, 2));
        const stock = stockRaw.Items?.map((stockItem) =>  ({
            product_id: stockItem.product_id.S,
            count: Number(stockItem.count.N)
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(products?.map((product) => {
                const stockOfProduct = stock?.find((stockItem) => stockItem.product_id === product.id)

                return {
                    ...product,
                    count: stockOfProduct?.count
                }
            }))
        };

    } catch (error) {
        console.error('Error:', error);
        throw new Error('Error in getting products from DynamoDB tables');
    }
}

import { Context, Hono } from 'hono';
import { BlobServiceClient, BlobSASPermissions } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { env } from 'env';

const fileRouter = new Hono()
const containerName = 'images'; 
const blobServiceClient = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING)
const containerClient = blobServiceClient.getContainerClient(containerName) 

fileRouter.get('/url-generator', async (c:Context) => {

    const originalFilename = String(c.req.query('filename'))
    const extension = originalFilename.split('.').pop() // get the file type
    const blobName = `${uuidv4()}.${extension}` // create a unique filename
    const blockBlobClient = containerClient.getBlockBlobClient(blobName)

    // generate a SAS token valid for 5 minutes with write permission
    const sasTokenUrl = await blockBlobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse("w"),
        expiresOn: new Date(new Date().valueOf() + 300000),
    })

    // return the url and the generated filename
    c.json({ 
        uploadUrl: sasTokenUrl, 
        blobName: blobName      
    }, 200)
})

export default fileRouter
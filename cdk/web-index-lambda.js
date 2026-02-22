const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});

module.exports.handler = async (event, context) => {
  const { WebBucketName, ApiBaseUrl } = event.ResourceProperties;

  try {
    switch (event.RequestType) {
      case "Create":
      case "Update":
        await patchIndexHtml();
        return { PhysicalResourceId: 'WebIndex' };
      case "Delete":
        return { PhysicalResourceId: event.PhysicalResourceId };
    }
  } catch (err) {
    console.error('Error:', err);
    throw err;
  }

  async function patchIndexHtml() {
    const response = await s3.send(new GetObjectCommand({ Bucket: WebBucketName, Key: 'index.html' }));
    const html = await streamToString(response.Body);

    if (!html) {
      throw Error('missing index.html');

    } else {
      const apiBaseUrlMeta = `<meta name="x-api-base" content="${ApiBaseUrl}">`;
      const replacedHtml = html.replace(/<meta name="x-api-base" content=".*">/, apiBaseUrlMeta);

      console.log('Updated index.html:', replacedHtml);

      return s3.send(new PutObjectCommand({
        Bucket: WebBucketName,
        Key: 'index.html',
        Body: replacedHtml,
        ContentType: 'text/html; charset=UTF-8'
      }));
    }
  }

  async function streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }
};

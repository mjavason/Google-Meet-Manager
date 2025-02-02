import express, { Request, Response, NextFunction } from 'express';
import 'express-async-errors';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { google } from 'googleapis';
import { SpacesServiceClient } from '@google-apps/meet';

//#region App Setup
const app = express();
dotenv.config({ path: './.env' });

const SWAGGER_OPTIONS = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Typescript SFA',
      version: '1.0.0',
      description:
        'This is a single file typescript template app for faster idea testing and prototyping. It contains tests, one demo root API call, basic async error handling, one demo axios call and .env support.',
      contact: {
        name: 'Orji Michael',
        email: 'orjimichael4886@gmail.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Environment',
      },
      {
        url: 'https://live.onrender.com/api/v1',
        description: 'Staging Environment',
      },
    ],
    tags: [
      {
        name: 'Default',
        description: 'Default API Operations that come inbuilt',
      },
    ],
  },
  apis: ['**/*.ts'],
};

const swaggerSpec = swaggerJSDoc(SWAGGER_OPTIONS);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(morgan('dev'));

//#endregion

//#region Keys and Configs
const PORT = process.env.PORT || 3000;
const baseURL = 'https://httpbin.org';
interface IServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_url: string;
  token_url: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}
const SERVICE_ACCOUNT_CREDENTIALS: IServiceAccountCredentials = JSON.parse(
  process.env.SERVICE_ACCOUNT_CREDENTIALS || '{}'
);
const SCOPE = ['https://www.googleapis.com/auth/meetings.space.created'];
const jwtClient = new google.auth.JWT({
  email: SERVICE_ACCOUNT_CREDENTIALS.client_email,
  key: SERVICE_ACCOUNT_CREDENTIALS.private_key,
  scopes: SCOPE,
  subject: 'orjimichael2240@gmail.com', // this email should be part of your workspace account
});
//#endregion

//#region Code here

/**
 * Creates a new meeting space.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function createSpace() {
  const meetClient = new SpacesServiceClient({ authClient: jwtClient });
  const request = {
    space: {
      config: {
        accessType: 1, // for open access to meeting link
      },
    },
  };

  // Run request
  const response = await meetClient.createSpace(request);
  console.log(`Meet URL: ${response[0].meetingUri}`);
  return response;
}

/**
 * @swagger
 * /:
 *   post:
 *     summary: Create a new meeting space
 *     description:
 *     tags: [Meet]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.post('/', async (req: Request, res: Response) => {
  const data = await createSpace();
  return res.send({ message: 'Space created successfully!', data });
});

//#endregion

//#region Server Setup

// Function to ping the server itself
async function pingSelf() {
  try {
    const { data } = await axios.get(`http://localhost:5000`);
    console.log(`Server pinged successfully: ${data.message}`);
    return true;
  } catch (e: any) {
    console.error(`Error pinging server: ${e.message}`);
    return false;
  }
}

// Route for external API call
/**
 * @swagger
 * /api:
 *   get:
 *     summary: Call a demo external API (httpbin.org)
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/api', async (req: Request, res: Response) => {
  try {
    const result = await axios.get(baseURL);
    return res.send({
      message: 'Demo API called (httpbin.org)',
      data: result.status,
    });
  } catch (error: any) {
    console.error('Error calling external API:', error.message);
    return res.status(500).send({ error: 'Failed to call external API' });
  }
});

// Route for health check
/**
 * @swagger
 * /:
 *   get:
 *     summary: API Health check
 *     description: Returns an object containing demo content
 *     tags: [Default]
 *     responses:
 *       '200':
 *         description: Successful.
 *       '400':
 *         description: Bad request.
 */
app.get('/', (req: Request, res: Response) => {
  return res.send({ message: 'API is Live!' });
});

// Middleware to handle 404 Not Found
/**
 * @swagger
 * /obviously/this/route/cant/exist:
 *   get:
 *     summary: API 404 Response
 *     description: Returns a non-crashing result when you try to run a route that doesn't exist
 *     tags: [Default]
 *     responses:
 *       '404':
 *         description: Route not found
 */
app.use((req: Request, res: Response) => {
  return res
    .status(404)
    .json({ success: false, message: 'API route does not exist' });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // throw Error('This is a sample error');
  console.log(err);
  console.log(`${'\x1b[31m'}${err.message}${'\x1b][0m]'} `);
  return res
    .status(500)
    .send({ success: false, status: 500, message: err.message });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
});

// (for render services) Keep the API awake by pinging it periodically
// setInterval(pingSelf, 600000);

//#endregion

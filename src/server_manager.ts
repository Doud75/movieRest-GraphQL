import { DefaultErrorHandler } from "@error/DefaultErrorHandler";
import { Log } from '@logging/Log';
import { requestLogMiddleware } from "@logging/log.middleware";
import { initGraphQL } from "@routes/graphql.route";
import { json } from "body-parser";
import Express, { NextFunction, Request, Response } from "express";
import { createServer, Server } from "http";
import swaggerUi from 'swagger-ui-express';
import { RegisterRoutes } from './routes/routes';
import Cors from 'cors';


export const StartServer = async () => {
  // Récupérer le port des variables d'environnement ou préciser une valeur par défaut
  const PORT = process.env.PORT || 5050;

  // Créer l'objet Express
  const app = Express();
  const httpServer = createServer(app);

  // Configurer CORS
  app.use(Cors())

  // L'appli parse le corps du message entrant comme du json
  app.use(json());

  // Utiliser un middleware pour créer des logs
  app.use(requestLogMiddleware('req'));

  // Graphql
  const graphql = await initGraphQL(httpServer);
  app.use('/graphql', graphql);

  RegisterRoutes(app);

  // Créer un endpoint GET
  app.get('/info', 
    (request: Request, response: Response, next: NextFunction) => {
      response.send("<h1>Hello world!</h1>");
    }
  );

  // Servir le contenu static du dossier `public`
  app.use(Express.static("public"));
  // Créer une route qui permet de convertir le .json en format html
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: "/swagger.json",
      },
    })
  );

  // Ajouter un handler pour les erreurs
  app.use(DefaultErrorHandler);

  // Lancer le serveur
  return new Promise<Server>(
    (resolve) => {
      httpServer.listen(PORT, () => {
        Log(`API Listening on port ${PORT}`)
        resolve(httpServer);
      })     
    }
  ); 
}

export const StopServer = async (server: Server|undefined) => {
  if (!server) { return; }
  return new Promise<void>(
    (resolve, reject) => {
      server.close(
        (err) => {
          if (err) {
            reject(err);            
          } else {
            resolve();
          }
        }
      )
    }
  );  
}
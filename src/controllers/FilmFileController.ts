import { NoSuchKey } from '@aws-sdk/client-s3';
import { ApiError } from '@error/ApiError';
import { ErrorCode } from '@error/ErrorCodes';
import { IFilmFile, IFilmFileCreate } from '@model/types/IFilmFile';
import { IORMCreateResponse, IORMIndexResponse } from '@orm/interfaces/IORM';
import { ORM } from '@orm/ORM';
import express from "express";
import multer from "multer";
import { Get, Middlewares, Path, Put, Query, Request, Route, SuccessResponse, Security } from 'tsoa';
import { ObjectStorage } from 'utility/storage/ObjectStorage';
import { v4 } from 'uuid';

/**
 * Controller pour la gestion des fichiers de films (ex: images de couverture)
 */
@Route("/film/{filmId}/file")
export class FilmFileController {

  /**
   * 🔹 Uploader une image pour un film (ADMIN uniquement)
   */
  @Put()
  @Security('jwt', ['admin'])
  @Middlewares(multer().single("file"))
  public async uploadFile(@Path() filmId: number, @Request() request: express.Request): Promise<IORMCreateResponse> {
    if (!request.file) {
      throw new ApiError(ErrorCode.BadRequest, 'object/invalid-multipart', 'Aucun fichier fourni dans la requête.');
    }

    const filename = request.file.originalname || v4();
    const storageKey = `film/${filmId}/${filename}`;

    await ObjectStorage.upload(
      request.file.buffer,
      storageKey,
      request.file.mimetype
    );

    const result = await ORM.Create<IFilmFileCreate>({
      table: 'film_file',
      body: {
        filmId,
        storageKey,
        filename,
        mimeType: request.file.mimetype
      }
    });

    return result;
  }

  /**
   * 🔹 Récupérer la liste des fichiers d’un film
   */
  @Get()
  public async showFiles(
    @Path() filmId: number,
    @Query() page?: string,
    @Query() limit?: string
  ): Promise<IORMIndexResponse<IFilmFile>> {
    return ORM.Index<IFilmFile>({
      table: 'film_file',
      columns: ['fileId', 'filmId', 'storageKey', 'filename', 'mimeType'],
      where: { filmId },
      query: { page, limit }
    });
  }

  /**
   * 🔹 Télécharger un fichier selon son ID
   */
  @Get("{fileId}")
  @SuccessResponse("200", "Chunked object stream") // Custom success response
  public async downloadFile(@Path() fileId: number, @Request() request: express.Request) {
    const response = request.res;
    if (!response) {
      throw new ApiError(ErrorCode.InternalError, 'object/invalid-response', "Impossible d’accéder à l’objet réponse.");
    }

    // 🔹 Vérifier que le fichier existe dans la base de données
    const file = await ORM.Read<IFilmFile>({
      table: 'film_file',
      idKey: 'fileId',
      idValue: fileId,
      columns: ['fileId', 'storageKey', 'mimeType']
    });

    // 🔹 Streamer le fichier
    await new Promise<void>(
      async (resolve, reject) => {
        try {
          const stream = await ObjectStorage.download(file.storageKey);
          response.writeHead(200, {
            'Content-Type': file.mimeType || 'application/octet-stream',
            'Transfer-Encoding': 'chunked'
          });

          stream.on('data', (chunk) => response.write(chunk));
          stream.on('error', reject);
          stream.on('end', () => {
            response.end();
            resolve();
          });

        } catch (err) {
          if (err instanceof NoSuchKey) {
            reject(new ApiError(ErrorCode.NotFound, 'object/key-not-found-in-storage', `Fichier introuvable dans le stockage`, { key: file.storageKey }));
          } else {
            reject(err);
          }
        }
      }
    );
  }
}
